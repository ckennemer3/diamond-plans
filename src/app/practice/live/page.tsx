'use client';

// ============================================
// /practice/live — Head Coach Live Practice View
// ============================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PracticeProvider, usePractice } from '@/contexts/PracticeContext';
import { usePracticeCache } from '@/hooks/usePracticeCache';
import OfflineIndicator from '@/components/OfflineIndicator';
import PracticeTimer from '@/components/PracticeTimer';
import CompactDrillCard from '@/components/CompactDrillCard';
import DrillCard from '@/components/DrillCard';
import type { PracticeSegment } from '@/contexts/PracticeContext';
import type { Player, Profile, SegmentType } from '@/lib/types';

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

// ---- Drill modal -----------------------------------------------------------

function DrillModal({
  segment,
  players,
  coaches,
  onClose,
}: {
  segment: PracticeSegment;
  players: Player[];
  coaches: Profile[];
  onClose: () => void;
}) {
  const drill = segment.drill ?? null;

  // Players in this segment
  const segPlayers = players.filter((p) => segment.player_ids.includes(p.id));
  const segCoaches = coaches.filter((c) => segment.coach_ids.includes(c.id));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Drill details"
    >
      {/* Close button */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {segment.station_name}
          </p>
          {drill && (
            <p className="font-bold text-[#1e3a5f] text-base leading-tight">{drill.name}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          aria-label="Close drill details"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-6 h-6"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {drill ? (
          <DrillCard
            drill={drill}
            playerNames={segPlayers.map((p) => p.name)}
            playerSkillLevels={segPlayers.map((p) => p.skill_level)}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-2xl mb-2">
              {segment.segment_type === 'water_break' ? '💧' : '📋'}
            </p>
            <p className="text-[#1e3a5f] font-bold text-lg">{segment.station_name}</p>
            {segCoaches.length > 0 && (
              <p className="text-gray-500 text-sm mt-1">
                Led by {segCoaches.map((c) => c.full_name).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Segment list item -----------------------------------------------------

function SegmentListItem({
  segment,
  index,
  isCurrent,
  players,
  coaches,
  onTap,
}: {
  segment: PracticeSegment;
  index: number;
  isCurrent: boolean;
  players: Player[];
  coaches: Profile[];
  onTap: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isCurrent && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isCurrent]);

  const segType = segment.segment_type;
  const segCoaches = coaches.filter((c) => segment.coach_ids.includes(c.id));

  return (
    <button
      ref={ref}
      type="button"
      onClick={onTap}
      className={[
        'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]',
        isCurrent
          ? 'bg-[#1e3a5f] text-white shadow-sm'
          : 'bg-white hover:bg-gray-50 active:bg-gray-100 text-[#1e3a5f]',
      ].join(' ')}
    >
      {/* Segment number */}
      <span
        className={[
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          isCurrent ? 'bg-[#f97316] text-white' : 'bg-gray-100 text-gray-600',
        ].join(' ')}
      >
        {index + 1}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={['font-semibold text-sm truncate', isCurrent ? 'text-white' : 'text-[#1e3a5f]'].join(' ')}>
          {segment.segment_type === 'water_break' ? '💧 ' : ''}
          {segment.station_name || segment.drill?.name || segmentTypeLabels[segType]}
        </p>
        {segCoaches.length > 0 && (
          <p className={['text-xs truncate', isCurrent ? 'text-[#a8c4e0]' : 'text-gray-500'].join(' ')}>
            {segCoaches.map((c) => c.full_name).join(', ')}
          </p>
        )}
      </div>

      {/* Duration */}
      <span className={['text-xs font-semibold shrink-0', isCurrent ? 'text-[#a8c4e0]' : 'text-gray-400'].join(' ')}>
        {segment.duration_minutes}m
      </span>
    </button>
  );
}

// ---- Active stations (floating coach section) ------------------------------

function ActiveStationsSection({
  segments,
  currentSegmentIndex,
  players,
  coaches,
  onSelectSegment,
}: {
  segments: PracticeSegment[];
  currentSegmentIndex: number;
  players: Player[];
  coaches: Profile[];
  onSelectSegment: (seg: PracticeSegment) => void;
}) {
  const currentSeg = segments[currentSegmentIndex];
  if (!currentSeg) return null;

  // For station type, show all concurrent stations at the same segment_order
  const sameBatch = segments.filter(
    (s) => s.segment_order === currentSeg.segment_order && s.segment_type === 'station',
  );

  if (sameBatch.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">
        All Active Stations
      </h3>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {sameBatch.map((seg) => {
          const segPlayers = players.filter((p) => seg.player_ids.includes(p.id));
          const segCoaches = coaches.filter((c) => seg.coach_ids.includes(c.id));
          return (
            <CompactDrillCard
              key={seg.id}
              drill={seg.drill!}
              stationName={seg.station_name}
              durationMinutes={seg.duration_minutes}
              players={segPlayers}
              coaches={segCoaches}
              onClick={() => onSelectSegment(seg)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---- Inner page (inside PracticeProvider) ----------------------------------

function LivePracticeInner({
  sessionId,
  players,
  coaches,
  segments,
}: {
  sessionId: string;
  players: Player[];
  coaches: Profile[];
  segments: PracticeSegment[];
}) {
  const router = useRouter();
  const {
    isActive,
    currentSegment,
    currentSegmentIndex,
    startPractice,
    completePractice,
  } = usePractice();

  const [modalSegment, setModalSegment] = useState<PracticeSegment | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Request Wake Lock to prevent screen sleep during practice
  useEffect(() => {
    async function acquireWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch {
          // Wake Lock not available — silently ignore
        }
      }
    }

    acquireWakeLock();

    // Re-acquire on visibility change (iOS Safari releases on hide)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  // Start practice on mount
  useEffect(() => {
    if (segments.length > 0 && !isActive) {
      startPractice(sessionId, segments);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  // Redirect when practice completes (all segments exhausted)
  const hasCompletedRef = useRef(false);
  useEffect(() => {
    if (!isActive && segments.length > 0 && !hasCompletedRef.current) {
      // Give a moment for last segment animation, then redirect
      hasCompletedRef.current = true;
      const t = setTimeout(() => {
        completePractice();
        router.push(`/dashboard?practice_complete=1&session_id=${sessionId}`);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [isActive, segments.length, completePractice, router, sessionId]);

  const isWaterBreak = currentSegment?.segment_type === 'water_break';
  const isStation = currentSegment?.segment_type === 'station';
  const segType = currentSegment?.segment_type ?? 'station';

  // Players / coaches for current segment
  const currentPlayers = players.filter((p) =>
    currentSegment?.player_ids.includes(p.id),
  );
  const currentCoaches = coaches.filter((c) =>
    currentSegment?.coach_ids.includes(c.id),
  );

  const handleSelectSegmentForModal = useCallback((seg: PracticeSegment) => {
    setModalSegment(seg);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">
      <OfflineIndicator />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1e3a5f] px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect x="16" y="3" width="18" height="18" rx="2" transform="rotate(45 16 3)" fill="#f97316" />
          </svg>
          <span className="text-white font-bold text-base tracking-tight">Live Practice</span>
        </div>
        {currentSegment && (
          <span
            className={[
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
              segmentTypeBgColors[segType],
            ].join(' ')}
          >
            {segmentTypeLabels[segType]}
          </span>
        )}
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Big timer */}
        <section className="bg-white rounded-2xl shadow-sm py-6 px-2 flex flex-col items-center">
          <PracticeTimer />
        </section>

        {/* Water break banner */}
        {isWaterBreak && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex flex-col items-center gap-2 text-center">
            <span className="text-5xl" aria-hidden="true">💧</span>
            <p className="text-sky-800 font-bold text-2xl">Water Break!</p>
            <p className="text-sky-700 text-base">
              {currentSegment?.duration_minutes} minute
              {currentSegment?.duration_minutes !== 1 ? 's' : ''} — let kids drink and rest
            </p>
          </div>
        )}

        {/* Current segment drill card */}
        {currentSegment?.drill && !isStation && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">
              Current Drill
            </h3>
            <DrillCard
              drill={currentSegment.drill}
              playerNames={currentPlayers.map((p) => p.name)}
              playerSkillLevels={currentPlayers.map((p) => p.skill_level)}
            />
          </section>
        )}

        {/* Floating coach view: all active stations */}
        {isStation && (
          <ActiveStationsSection
            segments={segments}
            currentSegmentIndex={currentSegmentIndex}
            players={players}
            coaches={coaches}
            onSelectSegment={handleSelectSegmentForModal}
          />
        )}

        {/* All segments list */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">
            Practice Schedule
          </h3>
          <div className="space-y-1.5">
            {segments.map((seg, i) => (
              <SegmentListItem
                key={seg.id}
                segment={seg}
                index={i}
                isCurrent={i === currentSegmentIndex}
                players={players}
                coaches={coaches}
                onTap={() => handleSelectSegmentForModal(seg)}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Drill detail modal */}
      {modalSegment && (
        <DrillModal
          segment={modalSegment}
          players={players}
          coaches={coaches}
          onClose={() => setModalSegment(null)}
        />
      )}
    </div>
  );
}

// ---- Loading / error states ------------------------------------------------

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center gap-4 p-8">
      <div className="w-10 h-10 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#1e3a5f] font-semibold text-lg">Loading practice plan…</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl" aria-hidden="true">⚠️</p>
      <p className="text-red-700 font-bold text-lg">Could not load practice</p>
      <p className="text-gray-600 text-sm max-w-xs">{message}</p>
    </div>
  );
}

function MissingSessionScreen() {
  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl" aria-hidden="true">🔗</p>
      <p className="text-[#1e3a5f] font-bold text-lg">No session found</p>
      <p className="text-gray-600 text-sm max-w-xs">
        Open this page from the practice plan with a valid session link.
      </p>
    </div>
  );
}

// ---- DataLoader: reads session_id from URL, fetches data -------------------

function DataLoader() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const { data, isOffline, isLoading, error } = usePracticeCache(sessionId);

  if (!sessionId) return <MissingSessionScreen />;
  if (isLoading) return <LoadingScreen />;
  if (error && !data) return <ErrorScreen message={error} />;
  if (!data) return <ErrorScreen message="Practice data unavailable." />;

  return (
    <>
      {isOffline && <OfflineIndicator />}
      <PracticeProvider>
        <LivePracticeInner
          sessionId={data.session_id}
          players={data.players}
          coaches={data.coaches}
          segments={data.segments as PracticeSegment[]}
        />
      </PracticeProvider>
    </>
  );
}

// ---- Page export -----------------------------------------------------------

export default function LivePracticePage() {
  return (
    <React.Suspense fallback={<LoadingScreen />}>
      <DataLoader />
    </React.Suspense>
  );
}
