// ============================================================
// /dashboard/season-summary — Season Summary (Server Component)
// ============================================================
// Shows a full-season overview: practices completed, attendance
// patterns, most-used drills, drill ratings, and per-week notes.
// ============================================================

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type {
  PracticeSession,
  Player,
  Drill,
  DrillFeedback,
} from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

// ── Types for joined queries ──────────────────────────────────────────────────

interface SessionWithPlayers extends PracticeSession {
  practice_session_players: { player_id: string }[];
}

interface DrillFeedbackWithDrill extends DrillFeedback {
  drill: Pick<Drill, 'id' | 'name' | 'category'> | null;
}

interface StationDrillRow {
  drill_id: string | null;
  drill: Pick<Drill, 'id' | 'name' | 'category'> | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TOTAL_WEEKS = 12;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const categoryLabels: Record<string, string> = {
  hitting: 'Hitting',
  fielding: 'Fielding',
  throwing: 'Throwing',
  baserunning: 'Baserunning',
  game_play: 'Game Play',
  warmup: 'Warm-Up',
  cooldown: 'Cool-Down',
};

const categoryVariants: Record<
  string,
  'advanced' | 'beginner' | 'default' | 'success' | 'warning'
> = {
  hitting: 'advanced',
  fielding: 'success',
  throwing: 'default',
  baserunning: 'warning',
  game_play: 'advanced',
  warmup: 'beginner',
  cooldown: 'beginner',
};

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
      {children}
    </h2>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        'rounded-2xl px-4 py-4 flex flex-col gap-1',
        accent ? 'text-white' : 'bg-white shadow-sm text-[#1e3a5f]',
      ].join(' ')}
      style={accent ? { backgroundColor: '#1e3a5f' } : undefined}
    >
      <p className={['text-3xl font-black leading-none', accent ? 'text-white' : 'text-[#1e3a5f]'].join(' ')}>
        {value}
      </p>
      <p className={['text-sm font-semibold', accent ? 'text-[#a8c4e0]' : 'text-gray-600'].join(' ')}>
        {label}
      </p>
      {sub && (
        <p className={['text-xs', accent ? 'text-[#a8c4e0]' : 'text-gray-400'].join(' ')}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SeasonSummaryPage() {
  const supabase = await createClient();

  // 1. All practice sessions with their attendance
  const { data: sessions } = await supabase
    .from('practice_sessions')
    .select('*, practice_session_players(player_id)')
    .order('date', { ascending: true })
    .returns<SessionWithPlayers[]>();

  const allSessions: SessionWithPlayers[] = sessions ?? [];
  const completedSessions = allSessions.filter((s) => s.status === 'completed');

  // 2. All active players
  const { data: playersData } = await supabase
    .from('players')
    .select('id, name, skill_level')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .returns<Pick<Player, 'id' | 'name' | 'skill_level'>[]>();

  const players: Pick<Player, 'id' | 'name' | 'skill_level'>[] = playersData ?? [];

  // 3. Station assignments to find most-used drills
  const completedSessionIds = completedSessions.map((s) => s.id);

  const drillUsageCounts: Map<string, { name: string; category: string; count: number }> = new Map();

  if (completedSessionIds.length > 0) {
    const { data: stationRows } = await supabase
      .from('station_assignments')
      .select('drill_id, drill:drills(id, name, category)')
      .in('session_id', completedSessionIds)
      .not('drill_id', 'is', null)
      .returns<StationDrillRow[]>();

    for (const row of stationRows ?? []) {
      if (!row.drill_id || !row.drill) continue;
      const existing = drillUsageCounts.get(row.drill_id);
      if (existing) {
        existing.count += 1;
      } else {
        drillUsageCounts.set(row.drill_id, {
          name: row.drill.name,
          category: row.drill.category,
          count: 1,
        });
      }
    }
  }

  const topDrills = Array.from(drillUsageCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 4. Drill feedback (ratings)
  const ratingsByDrill: Map<
    string,
    { name: string; category: string; thumbsUp: number; thumbsDown: number }
  > = new Map();

  if (completedSessionIds.length > 0) {
    const { data: feedbackRows } = await supabase
      .from('drill_feedback')
      .select('drill_id, rating, drill:drills(id, name, category)')
      .in('session_id', completedSessionIds)
      .not('rating', 'is', null)
      .returns<DrillFeedbackWithDrill[]>();

    for (const fb of feedbackRows ?? []) {
      if (!fb.drill_id || !fb.drill) continue;
      const existing = ratingsByDrill.get(fb.drill_id);
      const thumbUp = fb.rating !== null && fb.rating >= 4;
      const thumbDown = fb.rating !== null && fb.rating <= 2;

      if (existing) {
        if (thumbUp) existing.thumbsUp += 1;
        if (thumbDown) existing.thumbsDown += 1;
      } else {
        ratingsByDrill.set(fb.drill_id, {
          name: fb.drill.name,
          category: fb.drill.category,
          thumbsUp: thumbUp ? 1 : 0,
          thumbsDown: thumbDown ? 1 : 0,
        });
      }
    }
  }

  // Highest rated = most thumbs up relative to total ratings
  const ratedDrills = Array.from(ratingsByDrill.values()).filter(
    (d) => d.thumbsUp + d.thumbsDown > 0
  );

  const highestRated = [...ratedDrills]
    .sort((a, b) => {
      const aScore = a.thumbsUp / (a.thumbsUp + a.thumbsDown);
      const bScore = b.thumbsUp / (b.thumbsUp + b.thumbsDown);
      return bScore - aScore;
    })
    .slice(0, 5);

  const lowestRated = [...ratedDrills]
    .sort((a, b) => {
      const aScore = a.thumbsDown / (a.thumbsUp + a.thumbsDown);
      const bScore = b.thumbsDown / (b.thumbsUp + b.thumbsDown);
      return bScore - aScore;
    })
    .slice(0, 5);

  // 5. Attendance: count how many completed sessions each player attended
  const attendanceMap = new Map<string, number>();
  for (const session of completedSessions) {
    for (const { player_id } of session.practice_session_players) {
      attendanceMap.set(player_id, (attendanceMap.get(player_id) ?? 0) + 1);
    }
  }

  // Sort players by attendance descending
  const sortedByAttendance = players
    .map((p) => ({ ...p, attended: attendanceMap.get(p.id) ?? 0 }))
    .sort((a, b) => b.attended - a.attended);

  const mostAttended = sortedByAttendance.slice(0, 5);
  const leastAttended = [...sortedByAttendance].reverse().slice(0, 5);

  const completedCount = completedSessions.length;
  const completionPct = Math.round((completedCount / TOTAL_WEEKS) * 100);

  // Sessions with notes
  const sessionsWithNotes = completedSessions.filter(
    (s) => s.notes && s.notes.trim().length > 0
  );

  return (
    <div className="space-y-6 pb-8">
      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e3a5f] min-h-[48px]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Dashboard
      </Link>

      {/* ── Page title ────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-5 py-5 text-white"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        <p className="text-[#a8c4e0] text-xs font-semibold uppercase tracking-widest mb-1">
          Season Overview
        </p>
        <h1 className="text-2xl font-black leading-tight">Season Summary</h1>
        <p className="text-[#a8c4e0] text-sm mt-1">
          {completedCount} of {TOTAL_WEEKS} practices complete
        </p>
      </div>

      {/* ── Key stats ─────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader>Season at a Glance</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Practices Done"
            value={`${completedCount}/${TOTAL_WEEKS}`}
            sub={`${completionPct}% of season`}
            accent
          />
          <StatTile
            label="Players Rostered"
            value={players.length}
            sub="active players"
          />
          <StatTile
            label="Drills Run"
            value={drillUsageCounts.size}
            sub="unique drills"
          />
          <StatTile
            label="Drill Ratings"
            value={ratingsByDrill.size}
            sub="drills with feedback"
          />
        </div>
      </div>

      {/* ── Attendance ───────────────────────────────────────────────────── */}
      {players.length > 0 && completedCount > 0 && (
        <div>
          <SectionHeader>Attendance Patterns</SectionHeader>
          <div className="space-y-3">
            {/* Most attended */}
            <Card>
              <h3 className="font-bold text-[#1e3a5f] text-sm mb-3">
                Most Consistent Players
              </h3>
              <div className="space-y-2">
                {mostAttended.map((player, idx) => (
                  <div key={player.id} className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: idx === 0 ? '#f97316' : '#1e3a5f' }}
                    >
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-[#1e3a5f] truncate">
                      {player.name}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 shrink-0">
                      {player.attended}/{completedCount} practices
                    </span>
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          player.attended === completedCount
                            ? '#22c55e'
                            : player.attended >= completedCount * 0.75
                            ? '#f97316'
                            : '#e5e7eb',
                      }}
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Least attended (only show if there are players with 0 or few sessions) */}
            {leastAttended.some((p) => p.attended < completedCount) && (
              <Card>
                <h3 className="font-bold text-[#1e3a5f] text-sm mb-3">
                  Needs More Reps
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Players who have missed the most practices.
                </p>
                <div className="space-y-2">
                  {leastAttended
                    .filter((p) => p.attended < completedCount)
                    .slice(0, 5)
                    .map((player) => (
                      <div key={player.id} className="flex items-center gap-3">
                        <span className="flex-1 text-sm font-semibold text-[#1e3a5f] truncate">
                          {player.name}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 shrink-0">
                          {player.attended}/{completedCount} practices
                        </span>
                        <span
                          className="text-xs font-semibold shrink-0"
                          style={{
                            color: player.attended === 0 ? '#dc2626' : '#f97316',
                          }}
                        >
                          {player.attended === 0
                            ? 'No shows'
                            : `${completedCount - player.attended} missed`}
                        </span>
                      </div>
                    ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Most used drills ─────────────────────────────────────────────── */}
      {topDrills.length > 0 && (
        <div>
          <SectionHeader>Most Used Drills</SectionHeader>
          <Card>
            <div className="space-y-3">
              {topDrills.map((drill, idx) => (
                <div key={`${drill.name}-${idx}`} className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: idx === 0 ? '#f97316' : '#1e3a5f' }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1e3a5f] truncate">
                      {drill.name}
                    </p>
                    <Badge
                      variant={categoryVariants[drill.category] ?? 'default'}
                      className="mt-0.5"
                    >
                      {categoryLabels[drill.category] ?? drill.category}
                    </Badge>
                  </div>
                  <span className="text-sm font-bold text-[#1e3a5f] shrink-0">
                    {drill.count}x
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Drill ratings summary ─────────────────────────────────────────── */}
      {ratedDrills.length > 0 && (
        <div>
          <SectionHeader>Drill Feedback Summary</SectionHeader>
          <div className="space-y-3">
            {/* Highest rated */}
            {highestRated.length > 0 && (
              <Card>
                <h3 className="font-bold text-[#1e3a5f] text-sm mb-1">
                  Kids Loved These
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Drills with the most thumbs up relative to total ratings.
                </p>
                <div className="space-y-2.5">
                  {highestRated.map((drill, idx) => {
                    const total = drill.thumbsUp + drill.thumbsDown;
                    const pct = Math.round((drill.thumbsUp / total) * 100);
                    return (
                      <div key={`liked-${idx}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#1e3a5f] truncate flex-1">
                            {drill.name}
                          </p>
                          <span className="text-xs font-bold text-emerald-700 shrink-0">
                            {pct}% liked
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400">
                          {drill.thumbsUp} up / {drill.thumbsDown} down
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Lowest rated (needs improvement) */}
            {lowestRated.length > 0 &&
              lowestRated.some((d) => d.thumbsDown > 0) && (
                <Card>
                  <h3 className="font-bold text-[#1e3a5f] text-sm mb-1">
                    Needs Improvement
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Drills that got more thumbs down — worth revisiting.
                  </p>
                  <div className="space-y-2.5">
                    {lowestRated
                      .filter((d) => d.thumbsDown > 0)
                      .map((drill, idx) => {
                        const total = drill.thumbsUp + drill.thumbsDown;
                        const pct = Math.round((drill.thumbsDown / total) * 100);
                        return (
                          <div key={`needs-${idx}`} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-[#1e3a5f] truncate flex-1">
                                {drill.name}
                              </p>
                              <span className="text-xs font-bold text-red-600 shrink-0">
                                {pct}% disliked
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-red-400 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-400">
                              {drill.thumbsUp} up / {drill.thumbsDown} down
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              )}
          </div>
        </div>
      )}

      {/* ── Practice notes log ───────────────────────────────────────────── */}
      {sessionsWithNotes.length > 0 && (
        <div>
          <SectionHeader>Practice Notes</SectionHeader>
          <div className="space-y-2">
            {sessionsWithNotes.map((session) => (
              <Card key={session.id}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-bold text-[#1e3a5f] text-sm">
                      Week {session.week_number}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(session.date)}</p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0"
                  >
                    Completed
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{session.notes}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {completedCount === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-4xl mb-3" aria-hidden="true">⚾</p>
            <p className="font-bold text-[#1e3a5f] text-base mb-1">
              No completed practices yet
            </p>
            <p className="text-sm text-gray-500">
              Complete your first practice to see season stats here.
            </p>
          </div>
        </Card>
      )}

      {/* ── All sessions log ──────────────────────────────────────────────── */}
      {allSessions.length > 0 && (
        <div>
          <SectionHeader>All Practices ({allSessions.length})</SectionHeader>
          <div className="space-y-2">
            {allSessions.map((session) => {
              const attendees = session.practice_session_players.length;
              return (
                <div
                  key={session.id}
                  className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{
                      backgroundColor:
                        session.status === 'completed'
                          ? '#22c55e'
                          : session.status === 'active'
                          ? '#f97316'
                          : '#9ca3af',
                    }}
                  >
                    {session.week_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1e3a5f]">
                      Week {session.week_number}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(session.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {attendees > 0 && (
                      <p className="text-xs font-semibold text-gray-500">
                        {attendees} player{attendees !== 1 ? 's' : ''}
                      </p>
                    )}
                    <span
                      className="text-xs font-semibold capitalize"
                      style={{
                        color:
                          session.status === 'completed'
                            ? '#22c55e'
                            : session.status === 'active'
                            ? '#f97316'
                            : '#9ca3af',
                      }}
                    >
                      {session.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
