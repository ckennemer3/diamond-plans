'use client';

// ============================================
// useTimer — requestAnimationFrame-based practice segment timer
// ============================================
//
// Survives screen lock because remaining time is derived from
// Date.now() - segmentStartTime rather than an accumulated counter.

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  calculateRemaining,
  formatTime,
  isWarning as checkWarning,
  isComplete as checkComplete,
} from '@/lib/timer';

export interface UseTimerOptions {
  /** Called when the timer reaches 0. */
  onComplete?: () => void;
}

export interface UseTimerReturn {
  remainingMs: number;
  formattedTime: string;
  isWarning: boolean;
  isComplete: boolean;
  /** Start (or restart) the timer with a new duration. */
  start: (durationMs: number) => void;
  /** Pause the timer, preserving remaining time. */
  pause: () => void;
  /** Resume after pause. */
  resume: () => void;
  /** Stop and reset to the original duration. */
  reset: () => void;
}

export function useTimer({ onComplete }: UseTimerOptions = {}): UseTimerReturn {
  // --- Core timer state ---
  const [remainingMs, setRemainingMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Refs so RAF callback always has fresh values without recreating the loop
  const rafRef = useRef<number | null>(null);
  const segmentStartTimeRef = useRef<number>(0);   // wall-clock start
  const segmentDurationMsRef = useRef<number>(0);  // total duration
  const pausedRemainingRef = useRef<number>(0);    // ms left when paused
  const warnFiredRef = useRef(false);              // prevent repeat vibration
  const completeFiredRef = useRef(false);          // prevent repeat complete
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref current without resetting the loop
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // --- Audio chime (lazy-created once) ---
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);          // A5
      osc.frequency.setValueAtTime(1109.73, ctx.currentTime + 0.15); // C#6
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // AudioContext unavailable — ignore
    }
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // --- RAF loop ---
  const tick = useCallback(() => {
    const remaining = calculateRemaining(
      segmentStartTimeRef.current,
      segmentDurationMsRef.current,
    );

    setRemainingMs(remaining);

    // Warning vibration (once, when crossing 30 s)
    if (!warnFiredRef.current && checkWarning(remaining)) {
      warnFiredRef.current = true;
      vibrate([200, 100, 200]);
    }

    // Complete — vibrate + chime + callback
    if (!completeFiredRef.current && checkComplete(remaining)) {
      completeFiredRef.current = true;
      setIsRunning(false);
      vibrate([400, 100, 400]);
      playChime();
      onCompleteRef.current?.();
      return; // stop the loop
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [vibrate, playChime]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    stopLoop();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, stopLoop]);

  // Clean up on unmount
  useEffect(() => {
    return () => stopLoop();
  }, [stopLoop]);

  // --- Public API ---

  const start = useCallback((durationMs: number) => {
    stopLoop();
    segmentDurationMsRef.current = durationMs;
    segmentStartTimeRef.current = Date.now();
    pausedRemainingRef.current = durationMs;
    warnFiredRef.current = false;
    completeFiredRef.current = false;
    setRemainingMs(durationMs);
    setIsRunning(true);
    startLoop();
  }, [stopLoop, startLoop]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    stopLoop();
    // Snapshot how much time is left so resume can reconstruct the start time
    const remaining = calculateRemaining(
      segmentStartTimeRef.current,
      segmentDurationMsRef.current,
    );
    pausedRemainingRef.current = remaining;
    setRemainingMs(remaining);
    setIsRunning(false);
  }, [isRunning, stopLoop]);

  const resume = useCallback(() => {
    if (isRunning) return;
    // Reconstruct a virtual start time so the remaining aligns
    segmentStartTimeRef.current = Date.now() - (segmentDurationMsRef.current - pausedRemainingRef.current);
    setIsRunning(true);
    startLoop();
  }, [isRunning, startLoop]);

  const reset = useCallback(() => {
    stopLoop();
    setIsRunning(false);
    setRemainingMs(segmentDurationMsRef.current);
    pausedRemainingRef.current = segmentDurationMsRef.current;
    warnFiredRef.current = false;
    completeFiredRef.current = false;
  }, [stopLoop]);

  return {
    remainingMs,
    formattedTime: formatTime(remainingMs),
    isWarning: checkWarning(remainingMs),
    isComplete: checkComplete(remainingMs),
    start,
    pause,
    resume,
    reset,
  };
}
