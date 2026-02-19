// ============================================
// Offline cache for practice plans using localStorage
// ============================================

import type { CachedPracticePlan } from './types';

const CACHE_PREFIX = 'diamond-plans-practice-';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function buildKey(sessionId: string): string {
  return `${CACHE_PREFIX}${sessionId}`;
}

/**
 * Persists a practice plan to localStorage so it can be accessed offline.
 *
 * @param sessionId - The practice session UUID
 * @param data      - The full cached plan object to store
 */
export function savePracticeCache(sessionId: string, data: CachedPracticePlan): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(buildKey(sessionId), serialized);
  } catch (err) {
    // Storage quota exceeded or serialization error — fail silently
    console.warn('[cache] Failed to save practice cache:', err);
  }
}

/**
 * Loads a cached practice plan from localStorage.
 * Returns null if no entry exists for the given sessionId.
 *
 * @param sessionId - The practice session UUID
 * @returns         - The cached plan or null
 */
export function loadPracticeCache(sessionId: string): CachedPracticePlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as CachedPracticePlan;
  } catch (err) {
    console.warn('[cache] Failed to load practice cache:', err);
    return null;
  }
}

/**
 * Removes the cached practice plan for a given session from localStorage.
 *
 * @param sessionId - The practice session UUID
 */
export function clearPracticeCache(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(buildKey(sessionId));
  } catch (err) {
    console.warn('[cache] Failed to clear practice cache:', err);
  }
}

/**
 * Determines whether a cached plan is stale (older than 24 hours).
 * Accepts either a numeric timestamp (Date.now()) or an ISO date string.
 *
 * @param cachedAt - The timestamp when the cache was written
 * @returns        - true if the cache is older than 24 hours
 */
export function isCacheStale(cachedAt: string | number): boolean {
  const ts = typeof cachedAt === 'number' ? cachedAt : new Date(cachedAt).getTime();
  if (isNaN(ts)) return true;
  return Date.now() - ts > CACHE_TTL_MS;
}
