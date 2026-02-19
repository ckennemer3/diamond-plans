'use client';

// ============================================
// PracticeTimer — Big countdown display for live practice
// ============================================

import React from 'react';
import { usePractice } from '@/contexts/PracticeContext';
import type { SegmentType } from '@/lib/types';

// ---- Segment type label helpers ------------------------------------------

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

// ---- Sub-components -------------------------------------------------------

function SegmentDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  // Cap dots display at 12 before switching to a progress bar
  if (total <= 12) {
    return (
      <div className="flex items-center justify-center gap-1.5 flex-wrap px-4">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={[
              'rounded-full transition-all duration-300',
              i < current
                ? 'bg-[#1e3a5f] opacity-30 w-2 h-2'
                : i === current
                  ? 'bg-[#f97316] w-3 h-3'
                  : 'bg-gray-300 w-2 h-2',
            ].join(' ')}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  // Progress bar for long practices
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="px-6">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#f97316] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
          aria-label={`Segment ${current + 1} of ${total}`}
        />
      </div>
      <p className="text-center text-xs text-gray-500 mt-1 font-medium">
        {current + 1} / {total}
      </p>
    </div>
  );
}

// ---- Main component -------------------------------------------------------

interface PracticeTimerProps {
  onNext?: () => void;
}

export default function PracticeTimer({ onNext }: PracticeTimerProps) {
  const {
    formattedTime,
    isTimerWarning,
    isTimerComplete,
    currentSegment,
    currentSegmentIndex,
    totalSegments,
    isPaused,
    pauseTimer,
    resumeTimer,
    goToNextSegment,
  } = usePractice();

  const isWaterBreak = currentSegment?.segment_type === 'water_break';

  // Timer color logic
  let timerColorClass = 'text-[#1e3a5f]';
  if (isTimerComplete) {
    timerColorClass = 'text-green-600';
  } else if (isTimerWarning) {
    timerColorClass = 'text-[#f59e0b]';
  }

  const segType = currentSegment?.segment_type ?? 'station';
  const segLabel = segmentTypeLabels[segType] ?? 'Segment';
  const segBadgeClass = segmentTypeBgColors[segType] ?? 'bg-gray-100 text-gray-700';

  const handleNext = () => {
    goToNextSegment();
    onNext?.();
  };

  const segmentName =
    currentSegment?.station_name ||
    currentSegment?.drill?.name ||
    segLabel;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Segment name + type badge */}
      <div className="flex flex-col items-center gap-2 text-center px-4">
        <span
          className={[
            'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
            segBadgeClass,
          ].join(' ')}
        >
          {isWaterBreak ? '💧 ' : ''}{segLabel}
        </span>
        <h2 className="text-2xl font-bold text-[#1e3a5f] leading-tight">
          {isWaterBreak ? 'Water Break!' : segmentName}
        </h2>
        {isWaterBreak && (
          <p className="text-gray-500 text-sm font-medium">
            Let kids drink and rest
          </p>
        )}
      </div>

      {/* Big timer */}
      <div
        className={[
          'font-black tabular-nums leading-none tracking-tighter transition-colors duration-300',
          timerColorClass,
        ].join(' ')}
        style={{ fontSize: 'clamp(96px, 22vw, 160px)' }}
        aria-live="off"
        aria-label={`Time remaining: ${formattedTime}`}
      >
        {formattedTime}
      </div>

      {/* Status label below timer */}
      {isTimerComplete && (
        <p className="text-green-600 font-bold text-lg animate-pulse">
          Segment complete!
        </p>
      )}
      {isTimerWarning && !isTimerComplete && (
        <p className="text-[#f59e0b] font-bold text-base">
          30 seconds left — wrap up!
        </p>
      )}
      {isPaused && !isTimerComplete && !isTimerWarning && (
        <p className="text-gray-500 font-semibold text-base">Paused</p>
      )}

      {/* Pause / Resume + Next buttons */}
      <div className="flex gap-3 w-full px-4 max-w-sm">
        <button
          type="button"
          onClick={isPaused ? resumeTimer : pauseTimer}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-base border-2 border-[#1e3a5f] text-[#1e3a5f] bg-white active:bg-[#1e3a5f]/10 transition-colors min-h-[56px] select-none"
          aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
        >
          {isPaused ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              Resume
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentSegmentIndex >= totalSegments - 1}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-base bg-[#f97316] text-white active:bg-[#e8631a] transition-colors min-h-[56px] select-none disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Advance to next segment"
        >
          Next
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path d="M6 18l8.5-6L6 6v12zm9-12v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      {/* Progress indicator */}
      <div className="w-full">
        <SegmentDots total={totalSegments} current={currentSegmentIndex} />
      </div>
    </div>
  );
}
