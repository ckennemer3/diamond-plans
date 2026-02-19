// ============================================
// Timer utility functions (not React-specific)
// ============================================

/**
 * Calculates the number of milliseconds remaining in a segment.
 * Uses wall-clock time so it survives screen lock and tab switching.
 *
 * @param startTime  - Unix timestamp (ms) when the segment was started
 * @param durationMs - Total duration of the segment in milliseconds
 * @returns          - Milliseconds remaining, clamped to 0
 */
export function calculateRemaining(startTime: number, durationMs: number): number {
  const elapsed = Date.now() - startTime;
  return Math.max(0, durationMs - elapsed);
}

/**
 * Formats a millisecond value into "M:SS" display string.
 * Rounds up to the nearest second so the display reads naturally
 * (e.g., 90500 ms → "1:31", 0 ms → "0:00").
 *
 * @param ms - Milliseconds to format
 * @returns  - String in "M:SS" format
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Returns true when the remaining time is in the warning zone
 * (30 seconds or fewer).
 *
 * @param ms - Milliseconds remaining
 */
export function isWarning(ms: number): boolean {
  return ms > 0 && ms <= 30_000;
}

/**
 * Returns true when the segment has completed (no time remaining).
 *
 * @param ms - Milliseconds remaining
 */
export function isComplete(ms: number): boolean {
  return ms <= 0;
}
