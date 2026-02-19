'use client';

// ============================================
// usePracticeCache — load practice plan, fall back to localStorage
// ============================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  loadPracticeCache,
  savePracticeCache,
  isCacheStale,
} from '@/lib/cache';
import type { CachedPracticePlan, StationAssignment, Drill, Player, Profile } from '@/lib/types';

interface UsePracticeCacheReturn {
  data: CachedPracticePlan | null;
  isOffline: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePracticeCache(sessionId: string | null): UsePracticeCacheReturn {
  const [data, setData] = useState<CachedPracticePlan | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      // --- Try Supabase first ---
      try {
        const supabase = createClient();

        const [sessResult, segResult, playersResult, coachesResult] = await Promise.all([
          supabase
            .from('practice_sessions')
            .select('id, week_number, date, status, notes, created_at, completed_at')
            .eq('id', sessionId)
            .single(),

          supabase
            .from('station_assignments')
            .select(`
              *,
              drill:drills(*)
            `)
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

        if (sessResult.error) throw sessResult.error;
        if (segResult.error) throw segResult.error;
        if (playersResult.error) throw playersResult.error;
        if (coachesResult.error) throw coachesResult.error;

        const segments = (segResult.data ?? []) as (StationAssignment & { drill?: Drill })[];
        const players = (playersResult.data ?? []).map(
          (r: { player_id: string; players: unknown }) => r.players,
        ) as Player[];
        const coaches = (coachesResult.data ?? []).map(
          (r: { coach_id: string; profiles: unknown }) => r.profiles,
        ) as Profile[];

        const plan: CachedPracticePlan = {
          session_id: sessionId!,
          week_number: sessResult.data.week_number,
          segments,
          players,
          coaches,
          cached_at: Date.now(),
        };

        if (!cancelled) {
          savePracticeCache(sessionId!, plan);
          setData(plan);
          setIsOffline(false);
        }
      } catch {
        // Network failure — fall back to localStorage
        const cached = loadPracticeCache(sessionId!);
        if (!cancelled) {
          if (cached) {
            setData(cached);
            setIsOffline(true);
            if (isCacheStale(cached.cached_at)) {
              setError('You are offline and the cached data is over 24 hours old.');
            }
          } else {
            setIsOffline(true);
            setError('You are offline and no cached data is available for this session.');
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return { data, isOffline, isLoading, error };
}
