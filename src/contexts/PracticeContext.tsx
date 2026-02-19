'use client';

// ============================================
// PracticeContext — live practice session state
// ============================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useTimer } from '@/hooks/useTimer';
import type { StationAssignment, Drill } from '@/lib/types';

// ---- Types ---------------------------------------------------------------

export type PracticeSegment = StationAssignment & { drill?: Drill };

export interface PracticeState {
  sessionId: string | null;
  segments: PracticeSegment[];
  currentSegmentIndex: number;
  isActive: boolean;
  isPaused: boolean;

  // Derived from timer
  remainingMs: number;
  formattedTime: string;
  isTimerWarning: boolean;
  isTimerComplete: boolean;

  // Derived convenience
  currentSegment: PracticeSegment | null;
  /** The segment that will run after the current one, or null if at the end. */
  nextSegmentPreview: PracticeSegment | null;
  totalSegments: number;
  progressPercent: number; // 0–100

  // Actions
  startPractice: (sessionId: string, segments: PracticeSegment[]) => void;
  goToNextSegment: () => void;
  goToPrevSegment: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  completePractice: () => void;
}

// ---- Context ---------------------------------------------------------------

const PracticeContext = createContext<PracticeState | null>(null);

// ---- Provider ---------------------------------------------------------------

export function PracticeProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [segments, setSegments] = useState<PracticeSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Refs so the onComplete callback always closes over the latest values
  // without causing the timer hook to re-mount.
  const indexRef = useRef(currentSegmentIndex);
  indexRef.current = currentSegmentIndex;
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const handleSegmentComplete = useCallback(() => {
    const next = indexRef.current + 1;
    if (next < segmentsRef.current.length) {
      setCurrentSegmentIndex(next);
    } else {
      // Last segment finished — mark practice complete
      setIsActive(false);
      setIsPaused(false);
    }
  }, []);

  const timer = useTimer({ onComplete: handleSegmentComplete });

  // Unused ref kept for future use (e.g. preventing double-start)
  const lastStartedIndexRef = useRef<number>(-1);

  /**
   * Starts (or restarts) the timer for a segment at `index` within `segs`.
   * Called by startPractice, goToNextSegment, and goToPrevSegment so they
   * trigger the timer directly rather than relying on a useEffect.
   */
  const startSegmentTimer = useCallback(
    (index: number, segs: PracticeSegment[]) => {
      if (index < 0 || index >= segs.length) return;
      lastStartedIndexRef.current = index;
      const seg = segs[index];
      const durationMs = seg.duration_minutes * 60 * 1000;
      timer.start(durationMs);
    },
    [timer],
  );

  // ---- Public actions -------------------------------------------------------

  const startPractice = useCallback(
    (newSessionId: string, newSegments: PracticeSegment[]) => {
      if (!newSegments.length) return;
      setSessionId(newSessionId);
      setSegments(newSegments);
      setCurrentSegmentIndex(0);
      setIsActive(true);
      setIsPaused(false);
      startSegmentTimer(0, newSegments);
    },
    [startSegmentTimer],
  );

  const goToNextSegment = useCallback(() => {
    const next = currentSegmentIndex + 1;
    if (next >= segments.length) return;
    setCurrentSegmentIndex(next);
    setIsPaused(false);
    startSegmentTimer(next, segments);
  }, [currentSegmentIndex, segments, startSegmentTimer]);

  const goToPrevSegment = useCallback(() => {
    const prev = currentSegmentIndex - 1;
    if (prev < 0) return;
    setCurrentSegmentIndex(prev);
    setIsPaused(false);
    startSegmentTimer(prev, segments);
  }, [currentSegmentIndex, segments, startSegmentTimer]);

  const pauseTimer = useCallback(() => {
    timer.pause();
    setIsPaused(true);
  }, [timer]);

  const resumeTimer = useCallback(() => {
    timer.resume();
    setIsPaused(false);
  }, [timer]);

  const completePractice = useCallback(() => {
    timer.reset();
    setIsActive(false);
    setIsPaused(false);
  }, [timer]);

  // ---- Derived values -------------------------------------------------------

  const currentSegment = segments[currentSegmentIndex] ?? null;
  const nextSegmentPreview = segments[currentSegmentIndex + 1] ?? null;
  const totalSegments = segments.length;

  const progressPercent = useMemo(() => {
    if (!currentSegment) return 0;
    const totalMs = currentSegment.duration_minutes * 60 * 1000;
    if (totalMs === 0) return 100;
    const elapsed = totalMs - timer.remainingMs;
    return Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
  }, [currentSegment, timer.remainingMs]);

  // ---- Context value -------------------------------------------------------

  const value: PracticeState = {
    sessionId,
    segments,
    currentSegmentIndex,
    isActive,
    isPaused,

    remainingMs: timer.remainingMs,
    formattedTime: timer.formattedTime,
    isTimerWarning: timer.isWarning,
    isTimerComplete: timer.isComplete,

    currentSegment,
    nextSegmentPreview,
    totalSegments,
    progressPercent,

    startPractice,
    goToNextSegment,
    goToPrevSegment,
    pauseTimer,
    resumeTimer,
    completePractice,
  };

  return (
    <PracticeContext.Provider value={value}>
      {children}
    </PracticeContext.Provider>
  );
}

// ---- Consumer hook -------------------------------------------------------

export function usePractice(): PracticeState {
  const ctx = useContext(PracticeContext);
  if (!ctx) {
    throw new Error('usePractice must be used within a <PracticeProvider>');
  }
  return ctx;
}
