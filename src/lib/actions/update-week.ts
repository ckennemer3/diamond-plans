'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { WeeklySegmentType } from '@/lib/types';

// ── Remove drill assignment ───────────────────────────────────────────────────

export async function removeDrillAssignment(assignmentId: string, weekNumber: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('weekly_drill_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    throw new Error(`Failed to remove drill: ${error.message}`);
  }

  revalidatePath(`/dashboard/week/${weekNumber}`);
  revalidatePath('/dashboard/calendar');
}

// ── Add drill assignment ──────────────────────────────────────────────────────

export async function addDrillAssignment(formData: FormData) {
  const supabase = await createClient();

  const weekNumber = Number(formData.get('week_number'));
  const drillId = formData.get('drill_id') as string | null;
  const segmentType = formData.get('segment_type') as WeeklySegmentType | null;
  const durationStr = formData.get('duration_minutes') as string | null;

  if (!drillId || !segmentType || !weekNumber) {
    throw new Error('Missing required fields.');
  }

  const duration = durationStr ? Number(durationStr) : null;

  // Determine the next segment_order for this week
  const { data: existing } = await supabase
    .from('weekly_drill_assignments')
    .select('segment_order')
    .eq('week_number', weekNumber)
    .order('segment_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (existing?.segment_order ?? 0) + 1;

  // Fetch drill default duration if not provided
  let finalDuration = duration;
  if (!finalDuration) {
    const { data: drill } = await supabase
      .from('drills')
      .select('duration_minutes')
      .eq('id', drillId)
      .single();
    finalDuration = drill?.duration_minutes ?? 15;
  }

  const { error } = await supabase.from('weekly_drill_assignments').insert({
    week_number: weekNumber,
    drill_id: drillId,
    segment_order: nextOrder,
    segment_type: segmentType,
    duration_minutes: finalDuration,
  });

  if (error) {
    throw new Error(`Failed to add drill: ${error.message}`);
  }

  revalidatePath(`/dashboard/week/${weekNumber}`);
  revalidatePath('/dashboard/calendar');
}

// ── Save week notes ───────────────────────────────────────────────────────────

export async function saveWeekNotes(formData: FormData) {
  const supabase = await createClient();

  const weekNumber = Number(formData.get('week_number'));
  const notes = (formData.get('notes') as string | null) ?? '';

  if (!weekNumber) {
    throw new Error('Week number is required.');
  }

  const { error } = await supabase
    .from('weekly_plans')
    .upsert({ week_number: weekNumber, notes }, { onConflict: 'week_number' });

  if (error) {
    throw new Error(`Failed to save notes: ${error.message}`);
  }

  revalidatePath(`/dashboard/week/${weekNumber}`);
}
