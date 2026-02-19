'use server';

import { createClient } from '@/lib/supabase/server';
import type { PracticeSession } from '@/lib/types';

// ── Input / output types ──────────────────────────────────────────────────────

export interface StartPracticeInput {
  week_number: number;
  /** IDs of players who are physically present at practice */
  present_player_ids: string[];
  /** IDs of coaches who are physically present at practice */
  present_coach_ids: string[];
  /** Optional date override — defaults to today's date */
  date?: string;
}

export interface StartPracticeResult {
  success: true;
  session_id: string;
  session: PracticeSession;
}

export interface StartPracticeError {
  success: false;
  error: string;
}

// ── Action ────────────────────────────────────────────────────────────────────

/**
 * Creates a practice_session record in status 'active', then links
 * the present players and coaches via their junction tables.
 *
 * Returns the new session ID so callers can immediately use it to
 * generate and save a plan (see generate-plan.ts).
 */
export async function startPractice(
  input: StartPracticeInput
): Promise<StartPracticeResult | StartPracticeError> {
  const supabase = await createClient();

  // 1. Create the practice session
  const today = input.date ?? new Date().toISOString().split('T')[0];

  const { data: session, error: sessionError } = await supabase
    .from('practice_sessions')
    .insert({
      week_number: input.week_number,
      date: today,
      status: 'active',
    })
    .select()
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      error: `Failed to create practice session: ${sessionError?.message ?? 'unknown error'}`,
    };
  }

  const session_id = session.id;

  // 2. Link present players via junction table
  if (input.present_player_ids.length > 0) {
    const playerRows = input.present_player_ids.map((player_id) => ({
      session_id,
      player_id,
    }));

    const { error: playersError } = await supabase
      .from('practice_session_players')
      .insert(playerRows);

    if (playersError) {
      // Session was created — clean it up to avoid orphaned records
      await supabase.from('practice_sessions').delete().eq('id', session_id);
      return {
        success: false,
        error: `Failed to link players to session: ${playersError.message}`,
      };
    }
  }

  // 3. Link present coaches via junction table
  if (input.present_coach_ids.length > 0) {
    const coachRows = input.present_coach_ids.map((coach_id) => ({
      session_id,
      coach_id,
    }));

    const { error: coachesError } = await supabase
      .from('practice_session_coaches')
      .insert(coachRows);

    if (coachesError) {
      // Clean up session and player links
      await supabase.from('practice_sessions').delete().eq('id', session_id);
      return {
        success: false,
        error: `Failed to link coaches to session: ${coachesError.message}`,
      };
    }
  }

  return {
    success: true,
    session_id,
    session: session as PracticeSession,
  };
}

// ── Helper: fetch an active session for a given week ─────────────────────────

export interface GetActiveSessionResult {
  success: true;
  session: PracticeSession | null;
}

export interface GetActiveSessionError {
  success: false;
  error: string;
}

/**
 * Looks up the most recent active (or planning) session for a week.
 * Useful for resuming after a page reload.
 */
export async function getActiveSession(
  week_number: number
): Promise<GetActiveSessionResult | GetActiveSessionError> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('week_number', week_number)
    .in('status', ['planning', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { success: false, error: `Failed to fetch active session: ${error.message}` };
  }

  return { success: true, session: data as PracticeSession | null };
}
