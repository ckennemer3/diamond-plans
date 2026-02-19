'use server';

import { createClient } from '@/lib/supabase/server';
import type { PracticeSession } from '@/lib/types';

// ── Input / output types ──────────────────────────────────────────────────────

export interface DrillFeedbackInput {
  drill_id: string;
  rating: number | null; // 1–5
  notes: string | null;
}

export interface CompletePracticeInput {
  session_id: string;
  /** Optional overall session notes from the coach */
  notes?: string | null;
  /** Per-drill feedback entries */
  drill_feedback?: DrillFeedbackInput[];
}

export interface CompletePracticeResult {
  success: true;
  session: PracticeSession;
}

export interface CompletePracticeError {
  success: false;
  error: string;
}

// ── Action ────────────────────────────────────────────────────────────────────

/**
 * Marks a practice session as completed, saves session-level notes,
 * and inserts per-drill feedback records.
 *
 * Safe to call multiple times — notes and completed_at are overwritten
 * but drill_feedback rows are inserted fresh each call (callers should
 * only call this once, or delete existing feedback first if re-submitting).
 */
export async function completePractice(
  input: CompletePracticeInput
): Promise<CompletePracticeResult | CompletePracticeError> {
  const supabase = await createClient();

  // 1. Get the current user (coach submitting the completion)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Mark the session as completed with notes and timestamp
  const { data: session, error: sessionError } = await supabase
    .from('practice_sessions')
    .update({
      status: 'completed',
      notes: input.notes ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', input.session_id)
    .select()
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      error: `Failed to mark session as completed: ${sessionError?.message ?? 'unknown error'}`,
    };
  }

  // 3. Insert drill feedback rows if provided
  if (input.drill_feedback && input.drill_feedback.length > 0) {
    const feedbackRows = input.drill_feedback.map((fb) => ({
      session_id: input.session_id,
      drill_id: fb.drill_id,
      rating: fb.rating ?? null,
      notes: fb.notes ?? null,
      created_by: user.id,
    }));

    const { error: feedbackError } = await supabase.from('drill_feedback').insert(feedbackRows);

    if (feedbackError) {
      // Session is already marked complete — return a partial success warning
      return {
        success: false,
        error: `Session marked complete but feedback failed to save: ${feedbackError.message}`,
      };
    }
  }

  return {
    success: true,
    session: session as PracticeSession,
  };
}

// ── Helper: cancel (reset) a practice session back to 'planning' ─────────────

export async function cancelPractice(
  session_id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('practice_sessions')
    .update({ status: 'planning', completed_at: null })
    .eq('id', session_id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Helper: fetch all feedback for a session ─────────────────────────────────

export interface GetSessionFeedbackResult {
  success: true;
  feedback: {
    id: string;
    drill_id: string;
    rating: number | null;
    notes: string | null;
    created_by: string;
    created_at: string;
  }[];
}

export interface GetSessionFeedbackError {
  success: false;
  error: string;
}

export async function getSessionFeedback(
  session_id: string
): Promise<GetSessionFeedbackResult | GetSessionFeedbackError> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('drill_feedback')
    .select('id, drill_id, rating, notes, created_by, created_at')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true });

  if (error) {
    return { success: false, error: `Failed to fetch session feedback: ${error.message}` };
  }

  return { success: true, feedback: data ?? [] };
}

// ── Helper: update (upsert) a single drill feedback record ───────────────────

export interface UpsertDrillFeedbackInput {
  session_id: string;
  drill_id: string;
  rating: number | null;
  notes: string | null;
}

export interface UpsertDrillFeedbackResult {
  success: true;
  feedback_id: string;
}

export interface UpsertDrillFeedbackError {
  success: false;
  error: string;
}

/**
 * Inserts or updates a single drill_feedback row for the given session + drill.
 * Useful for coaches who submit feedback incrementally during practice.
 */
export async function upsertDrillFeedback(
  input: UpsertDrillFeedbackInput
): Promise<UpsertDrillFeedbackResult | UpsertDrillFeedbackError> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check for an existing feedback row for this session + drill + user
  const { data: existing } = await supabase
    .from('drill_feedback')
    .select('id')
    .eq('session_id', input.session_id)
    .eq('drill_id', input.drill_id)
    .eq('created_by', user.id)
    .maybeSingle();

  if (existing?.id) {
    // Update existing
    const { error: updateError } = await supabase
      .from('drill_feedback')
      .update({ rating: input.rating, notes: input.notes })
      .eq('id', existing.id);

    if (updateError) {
      return { success: false, error: `Failed to update drill feedback: ${updateError.message}` };
    }

    return { success: true, feedback_id: existing.id };
  }

  // Insert new
  const { data: inserted, error: insertError } = await supabase
    .from('drill_feedback')
    .insert({
      session_id: input.session_id,
      drill_id: input.drill_id,
      rating: input.rating,
      notes: input.notes,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return {
      success: false,
      error: `Failed to save drill feedback: ${insertError?.message ?? 'unknown error'}`,
    };
  }

  return { success: true, feedback_id: inserted.id };
}
