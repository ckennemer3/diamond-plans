'use client';

// ============================================
// /coach — Assistant Coach View
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DrillCard from '@/components/DrillCard';
import StationAssignment from '@/components/StationAssignment';
import OfflineIndicator from '@/components/OfflineIndicator';
import Badge from '@/components/ui/Badge';
import type {
  StationAssignment as StationAssignmentType,
  Drill,
  Player,
  Profile,
  PracticeSession,
  SegmentType,
} from '@/lib/types';

// ---- Types -----------------------------------------------------------------

type EnrichedSegment = StationAssignmentType & { drill?: Drill };

interface ActiveSession {
  session: PracticeSession;
  segments: EnrichedSegment[];
  players: Player[];
  coaches: Profile[];
}

// ---- Helpers ---------------------------------------------------------------

const segmentTypeLabels: Record<SegmentType, string> = {
  warmup: 'Warm-Up',
  station: 'Station',
  water_break: 'Water Break',
  team_activity: 'Team Activity',
  cooldown: 'Cool-Down',
  transition: 'Transition',
};

const segmentTypeBgColors: Record<SegmentType, string> = {
  warmup: 'bg-green-100 text-green-800',
  station: 'bg-blue-100 text-blue-800',
  water_break: 'bg-sky-100 text-sky-800',
  team_activity: 'bg-purple-100 text-purple-800',
  cooldown: 'bg-teal-100 text-teal-800',
  transition: 'bg-gray-100 text-gray-700',
};

// ---- Fetch active session --------------------------------------------------

async function fetchActiveSession(): Promise<ActiveSession | null> {
  const supabase = createClient();

  // Look for the most recently created active session for today
  const today = new Date().toISOString().split('T')[0];

  const { data: sessionData, error: sessionError } = await supabase
    .from('practice_sessions')
    .select('id, week_number, date, status, notes, created_at, completed_at')
    .eq('status', 'active')
    .gte('date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError || !sessionData) return null;

  const sessionId = sessionData.id;

  const [segResult, playersResult, coachesResult] = await Promise.all([
    supabase
      .from('station_assignments')
      .select('*, drill:drills(*)')
      .eq('session_id', sessionId)
      .order('segment_order'),

    supabase
      .from('practice_session_players')
      .select('player_id, players(*)')
      .eq('session_id', sessionId),

    supabase
      .from('practice_session_coaches')
      .select('coach_id, profiles(*)')
      .eq('session_id', sessionId),
  ]);

  if (segResult.error || playersResult.error || coachesResult.error) return null;

  const segments = (segResult.data ?? []) as EnrichedSegment[];
  const players = (playersResult.data ?? []).map(
    (r: { player_id: string; players: unknown }) => r.players,
  ) as Player[];
  const coaches = (coachesResult.data ?? []).map(
    (r: { coach_id: string; profiles: unknown }) => r.profiles,
  ) as Profile[];

  return { session: sessionData as PracticeSession, segments, players, coaches };
}

// ---- No-practice screen ---------------------------------------------------

function NoPracticeScreen({ onRefresh }: { onRefresh: () => void }) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          onRefresh();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-8 text-center gap-6">
      <svg width="64" height="64" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="16" y="3" width="18" height="18" rx="2" transform="rotate(45 16 3)" fill="#1e3a5f" opacity="0.3" />
      </svg>
      <div>
        <h1 className="text-[#1e3a5f] font-bold text-2xl leading-tight mb-2">
          No Practice Started Yet
        </h1>
        <p className="text-gray-600 text-base leading-relaxed max-w-xs mx-auto">
          Check back when Coach Chase starts today&apos;s session.
        </p>
      </div>

      <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-3 text-center">
        <p className="text-[#f97316] font-semibold text-sm">
          Auto-refreshing in {countdown}s
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-2 bg-[#1e3a5f] text-white font-bold rounded-xl px-6 py-3 min-h-[48px] active:bg-[#162d4a] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.335 9A9 9 0 0118.83 15M18.665 15A9 9 0 015.17 9" />
        </svg>
        Refresh Now
      </button>

      {/* Pro tip */}
      <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/10 rounded-xl p-4 max-w-sm">
        <p className="text-xs text-gray-600 leading-relaxed">
          <span className="font-bold text-[#1e3a5f]">Pro tip:</span> Open the app before heading
          to practice to make sure everything loads.
        </p>
      </div>
    </div>
  );
}

// ---- Tab: My Station -------------------------------------------------------

function MyStationTab({
  mySegments,
  allSegments,
  players,
  coaches,
  myCoachId,
}: {
  mySegments: EnrichedSegment[];
  allSegments: EnrichedSegment[];
  players: Player[];
  coaches: Profile[];
  myCoachId: string;
}) {
  // Derive "current" segment based on cumulative time and start_offset_minutes.
  // We use a simple approach: find the segment whose time window is active.
  // Since we don't have the live timer here, we find the first my-segment
  // whose rotation_number matches the current rotation derived from allSegments.
  // Best effort: show the first segment in segment_order that is not yet done.
  // For a fully offline/standalone coach page, we pick based on earliest start_offset.

  const [nowOffset, setNowOffset] = useState<number>(0);

  // Poll every 5 seconds to update perceived current time
  useEffect(() => {
    // We don't have session start time here, so we'll just show all segments
    // and let the coach scroll. A future enhancement would store session start
    // time in localStorage/Supabase and derive elapsed time here.
    setNowOffset(0);
  }, []);
  void nowOffset; // used for future enhancement

  const currentSegment = mySegments[0] ?? null;
  const isWaterBreak = currentSegment?.segment_type === 'water_break';
  const isWarmupOrTeam =
    currentSegment?.segment_type === 'warmup' ||
    currentSegment?.segment_type === 'team_activity';

  const segPlayers = players.filter((p) =>
    currentSegment?.player_ids.includes(p.id),
  );
  const segCoaches = coaches.filter((c) =>
    currentSegment?.coach_ids.includes(c.id),
  );

  // Head coach (not me)
  const headCoach = coaches.find((c) => c.id !== myCoachId && c.role === 'head_coach');

  if (!currentSegment) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
        <p className="text-4xl" aria-hidden="true">✅</p>
        <p className="text-[#1e3a5f] font-bold text-xl">
          You&apos;re all done for this practice!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Water break */}
      {isWaterBreak && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex flex-col items-center gap-2 text-center">
          <span className="text-5xl" aria-hidden="true">💧</span>
          <p className="text-sky-800 font-bold text-2xl">Water Break!</p>
          <p className="text-sky-700 text-base">
            Let kids drink and move around.
          </p>
        </div>
      )}

      {/* Warmup / Team game led by head coach */}
      {isWarmupOrTeam && headCoach && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-purple-500 text-lg" aria-hidden="true">👥</span>
          <p className="text-purple-800 text-sm font-semibold">
            Led by {headCoach.full_name}
          </p>
        </div>
      )}

      {/* Current segment header */}
      {!isWaterBreak && (
        <div className="flex items-center gap-2">
          <span
            className={[
              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide',
              segmentTypeBgColors[currentSegment.segment_type],
            ].join(' ')}
          >
            {segmentTypeLabels[currentSegment.segment_type]}
          </span>
          <span className="text-[#1e3a5f] font-bold text-sm">
            {currentSegment.station_name}
          </span>
        </div>
      )}

      {/* Drill card — how to explain is already at TOP in DrillCard */}
      {currentSegment.drill && (
        <DrillCard
          drill={currentSegment.drill}
          playerNames={segPlayers.map((p) => p.name)}
          playerSkillLevels={segPlayers.map((p) => p.skill_level)}
        />
      )}

      {/* No drill but has players (e.g. warmup without a drill) */}
      {!currentSegment.drill && segPlayers.length > 0 && (
        <StationAssignment
          stationName={currentSegment.station_name}
          drill={null}
          coaches={segCoaches}
          players={segPlayers}
          durationMinutes={currentSegment.duration_minutes}
        />
      )}

      {/* Upcoming segments for this coach */}
      {mySegments.length > 1 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Your Upcoming Segments
          </h3>
          <div className="space-y-2">
            {mySegments.slice(1).map((seg) => {
              const segP = players.filter((p) => seg.player_ids.includes(p.id));
              const segC = coaches.filter((c) => seg.coach_ids.includes(c.id));
              return (
                <StationAssignment
                  key={seg.id}
                  stationName={seg.station_name}
                  drill={seg.drill ?? null}
                  coaches={segC}
                  players={segP}
                  durationMinutes={seg.duration_minutes}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Tab: Full Schedule ----------------------------------------------------

function FullScheduleTab({
  segments,
  players,
  coaches,
  myCoachId,
}: {
  segments: EnrichedSegment[];
  players: Player[];
  coaches: Profile[];
  myCoachId: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group by segment_order so concurrent stations show together
  const grouped = segments.reduce<Record<number, EnrichedSegment[]>>((acc, seg) => {
    const key = seg.segment_order;
    if (!acc[key]) acc[key] = [];
    acc[key].push(seg);
    return acc;
  }, {});

  const orderedKeys = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {orderedKeys.map((order) => {
        const group = grouped[order];
        const isMultiStation = group.length > 1;

        return (
          <div key={order}>
            {isMultiStation && (
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 px-1">
                Rotation {order}
              </p>
            )}
            <div className="space-y-2">
              {group.map((seg) => {
                const segPlayers = players.filter((p) => seg.player_ids.includes(p.id));
                const segCoaches = coaches.filter((c) => seg.coach_ids.includes(c.id));
                const isMe = seg.coach_ids.includes(myCoachId);
                const isExpanded = expandedId === seg.id;

                return (
                  <div key={seg.id}>
                    {/* Tappable header */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : seg.id)}
                      className={[
                        'w-full text-left bg-white rounded-xl border shadow-sm px-3 py-3 flex items-center gap-3 min-h-[56px] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-shadow',
                        isMe ? 'border-[#f97316] ring-1 ring-[#f97316]/30' : 'border-gray-100',
                      ].join(' ')}
                      aria-expanded={isExpanded}
                    >
                      {/* Station badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {isMe && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#f97316] text-white">
                              My Station
                            </span>
                          )}
                          <span
                            className={[
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                              segmentTypeBgColors[seg.segment_type],
                            ].join(' ')}
                          >
                            {segmentTypeLabels[seg.segment_type]}
                          </span>
                        </div>
                        <p className="font-bold text-[#1e3a5f] text-sm truncate">
                          {seg.segment_type === 'water_break' ? '💧 ' : ''}
                          {seg.station_name || seg.drill?.name || segmentTypeLabels[seg.segment_type]}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {segCoaches.map((c) => c.full_name).join(', ')} · {seg.duration_minutes}m
                        </p>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className={[
                          'w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200',
                          isExpanded ? 'rotate-180' : '',
                        ].join(' ')}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mt-1 px-1">
                        {seg.drill ? (
                          <DrillCard
                            drill={seg.drill}
                            playerNames={segPlayers.map((p) => p.name)}
                            playerSkillLevels={segPlayers.map((p) => p.skill_level)}
                          />
                        ) : (
                          <StationAssignment
                            stationName={seg.station_name}
                            drill={null}
                            coaches={segCoaches}
                            players={segPlayers}
                            durationMinutes={seg.duration_minutes}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Main coach page -------------------------------------------------------

export default function CoachPage() {
  const { profile, loading: authLoading } = useAuth();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [activeTab, setActiveTab] = useState<'my_station' | 'schedule'>('my_station');

  const loadSession = useCallback(async () => {
    setIsLoadingSession(true);
    try {
      const result = await fetchActiveSession();
      setActiveSession(result);
    } catch {
      setActiveSession(null);
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      loadSession();
    }
  }, [authLoading, loadSession]);

  // ---- Auth / loading states ----

  if (authLoading || isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#1e3a5f] font-semibold text-lg">Loading…</p>
      </div>
    );
  }

  if (!activeSession) {
    return <NoPracticeScreen onRefresh={loadSession} />;
  }

  const { segments, players, coaches } = activeSession;
  const myCoachId = profile?.id ?? '';

  // Segments where I am a coach
  const mySegments = segments.filter((s) => s.coach_ids.includes(myCoachId));

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">
      <OfflineIndicator />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1e3a5f] px-4 py-3 shadow-md">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="16" y="3" width="18" height="18" rx="2" transform="rotate(45 16 3)" fill="#f97316" />
            </svg>
            <span className="text-white font-bold text-base tracking-tight">Diamond Plans</span>
          </div>
          {profile && (
            <span className="text-[#a8c4e0] text-sm font-medium truncate max-w-[140px]">
              {profile.full_name}
            </span>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[52px] z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('my_station')}
            className={[
              'flex-1 py-3 text-sm font-bold text-center transition-colors min-h-[48px] border-b-2',
              activeTab === 'my_station'
                ? 'text-[#1e3a5f] border-[#f97316]'
                : 'text-gray-500 border-transparent hover:text-[#1e3a5f]',
            ].join(' ')}
          >
            My Station
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={[
              'flex-1 py-3 text-sm font-bold text-center transition-colors min-h-[48px] border-b-2',
              activeTab === 'schedule'
                ? 'text-[#1e3a5f] border-[#f97316]'
                : 'text-gray-500 border-transparent hover:text-[#1e3a5f]',
            ].join(' ')}
          >
            Full Schedule
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full">
        {/* Pro tip banner — shown in My Station tab only */}
        {activeTab === 'my_station' && (
          <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/10 rounded-xl p-3 mb-4 flex items-start gap-2">
            <span className="text-lg shrink-0" aria-hidden="true">💡</span>
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-bold text-[#1e3a5f]">Pro tip:</span> Open the app before
              heading to practice to make sure everything loads.
            </p>
          </div>
        )}

        {activeTab === 'my_station' ? (
          <MyStationTab
            mySegments={mySegments}
            allSegments={segments}
            players={players}
            coaches={coaches}
            myCoachId={myCoachId}
          />
        ) : (
          <FullScheduleTab
            segments={segments}
            players={players}
            coaches={coaches}
            myCoachId={myCoachId}
          />
        )}
      </main>
    </div>
  );
}
