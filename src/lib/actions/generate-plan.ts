'use server';

import { createClient } from '@/lib/supabase/server';
import { generatePracticePlan } from '@/lib/grouping';
import type {
  DrillCategory,
  GeneratedSegment,
  GroupingInput,
  GroupingOutput,
  Player,
  Profile,
  WeeklyDrillAssignment,
  Drill,
} from '@/lib/types';

// ── Input / output types ──────────────────────────────────────────────────────

export interface GeneratePlanInput {
  week_number: number;
  present_player_ids: string[];
  present_coach_ids: string[];
  focus_overrides?: DrillCategory[];
  /** IDs of drills used in the last 2 practices (optional, used to avoid repetition). */
  recent_drill_ids?: string[];
}

export interface GeneratePlanResult {
  success: true;
  plan: GroupingOutput;
}

export interface GeneratePlanError {
  success: false;
  error: string;
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function generatePlan(
  input: GeneratePlanInput
): Promise<GeneratePlanResult | GeneratePlanError> {
  const supabase = await createClient();

  // 1. Fetch the players who are present
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .in('id', input.present_player_ids);

  if (playersError) {
    return { success: false, error: `Failed to fetch players: ${playersError.message}` };
  }

  // 2. Fetch the coaches who are present
  const { data: coaches, error: coachesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', input.present_coach_ids);

  if (coachesError) {
    return { success: false, error: `Failed to fetch coaches: ${coachesError.message}` };
  }

  // 3. Fetch this week's drill assignments, including the full drill record
  const { data: drillAssignments, error: drillsError } = await supabase
    .from('weekly_drill_assignments')
    .select(`
      id,
      week_number,
      drill_id,
      segment_order,
      segment_type,
      duration_minutes,
      drill:drills (*)
    `)
    .eq('week_number', input.week_number)
    .order('segment_order', { ascending: true });

  if (drillsError) {
    return { success: false, error: `Failed to fetch drills: ${drillsError.message}` };
  }

  // Supabase JS infers joined relations with a slightly different shape; cast through
  // unknown so we can safely narrow to the domain type.
  const rawAssignments = (drillAssignments ?? []) as unknown as (WeeklyDrillAssignment & {
    drill: Drill | null;
  })[];

  const drillsForWeek: (WeeklyDrillAssignment & { drill: Drill })[] = rawAssignments.filter(
    (d): d is WeeklyDrillAssignment & { drill: Drill } => d.drill != null
  );

  // 4. Build the grouping input and call the pure algorithm
  const groupingInput: GroupingInput = {
    present_players: (players ?? []) as Player[],
    present_coaches: (coaches ?? []) as Profile[],
    drills_for_week: drillsForWeek,
    focus_overrides: input.focus_overrides ?? [],
    week_number: input.week_number,
    recent_drill_ids: input.recent_drill_ids ?? [],
  };

  const plan = generatePracticePlan(groupingInput);

  return { success: true, plan };
}

// ── Save plan to an existing session ─────────────────────────────────────────

export interface SavePlanInput {
  session_id: string;
  segments: GeneratedSegment[];
}

export interface SavePlanResult {
  success: true;
}

export interface SavePlanError {
  success: false;
  error: string;
}

/**
 * Persists the generated segments to the station_assignments table.
 * Deletes any previous assignments for this session first (idempotent re-plan).
 */
export async function savePlanToSession(
  input: SavePlanInput
): Promise<SavePlanResult | SavePlanError> {
  const supabase = await createClient();

  // Delete existing assignments for this session (allow re-planning)
  const { error: deleteError } = await supabase
    .from('station_assignments')
    .delete()
    .eq('session_id', input.session_id);

  if (deleteError) {
    return { success: false, error: `Failed to clear old assignments: ${deleteError.message}` };
  }

  // Build rows to insert
  const rows = input.segments.map((seg) => ({
    session_id: input.session_id,
    segment_order: seg.segment_order,
    segment_type: seg.segment_type,
    drill_id: seg.drill_id ?? null,
    coach_ids: seg.coach_ids,
    player_ids: seg.player_ids,
    station_name: seg.station_name,
    duration_minutes: seg.duration_minutes,
    start_offset_minutes: seg.start_offset_minutes,
    rotation_number: seg.rotation_number ?? null,
  }));

  const { error: insertError } = await supabase.from('station_assignments').insert(rows);

  if (insertError) {
    return { success: false, error: `Failed to save assignments: ${insertError.message}` };
  }

  return { success: true };
}

// ── Combined: generate + save in one call ─────────────────────────────────────

export interface GenerateAndSavePlanInput extends GeneratePlanInput {
  session_id: string;
}

export interface GenerateAndSavePlanResult {
  success: true;
  plan: GroupingOutput;
}

export interface GenerateAndSavePlanError {
  success: false;
  error: string;
}

export async function generateAndSavePlan(
  input: GenerateAndSavePlanInput
): Promise<GenerateAndSavePlanResult | GenerateAndSavePlanError> {
  // Generate
  const genResult = await generatePlan(input);
  if (!genResult.success) return genResult;

  // Save
  const saveResult = await savePlanToSession({
    session_id: input.session_id,
    segments: genResult.plan.segments,
  });
  if (!saveResult.success) return saveResult;

  return { success: true, plan: genResult.plan };
}
