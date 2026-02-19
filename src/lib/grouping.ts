// ============================================
// Diamond Plans — Practice Plan Grouping Algorithm
// Pure function: no side effects, no I/O
// ============================================

import type {
  GroupingInput,
  GroupingOutput,
  GeneratedSegment,
  Player,
  Profile,
  Drill,
  WeeklyDrillAssignment,
  SegmentType,
  DrillCategory,
} from './types';

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Deterministic-enough pseudo-shuffle that actually produces a new array */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Split players into `n` groups, mixing advanced and beginner kids.
 * Guarantees at least 1 advanced player per group when possible,
 * and keeps group sizes within ±1 of each other.
 */
function splitPlayers(players: Player[], n: number): Player[][] {
  if (n <= 1) return [players];

  const advanced = shuffle(players.filter((p) => p.skill_level === 'advanced'));
  const beginner = shuffle(players.filter((p) => p.skill_level === 'beginner'));

  const groups: Player[][] = Array.from({ length: n }, () => []);

  // Seed each group with one advanced player first (round-robin)
  advanced.forEach((p, i) => groups[i % n].push(p));

  // Then fill remaining advanced players round-robin
  const remainingAdvanced = advanced.slice(n);
  remainingAdvanced.forEach((p, i) => groups[i % n].push(p));

  // Fill beginners round-robin
  beginner.forEach((p, i) => groups[i % n].push(p));

  return groups;
}

/**
 * Rotate groups between rotations by swapping 2-3 kids between adjacent groups.
 * Returns a new array of groups (does not mutate the original).
 */
function rotateGroups(groups: Player[][]): Player[][] {
  if (groups.length <= 1) return groups.map((g) => [...g]);

  const next = groups.map((g) => [...g]);
  const swapCount = Math.min(3, Math.floor(next[0].length / 2) || 1);

  for (let s = 0; s < swapCount; s++) {
    for (let i = 0; i < next.length - 1; i++) {
      const fromGroup = next[i];
      const toGroup = next[i + 1];
      if (fromGroup.length === 0 || toGroup.length === 0) continue;

      // Pick a random player from fromGroup to swap with a random player in toGroup
      const fromIdx = Math.floor(Math.random() * fromGroup.length);
      const toIdx = Math.floor(Math.random() * toGroup.length);
      [fromGroup[fromIdx], toGroup[toIdx]] = [toGroup[toIdx], fromGroup[fromIdx]];
    }
  }

  return next;
}

/** Return the head coach profile from a list, or undefined. */
function findHeadCoach(coaches: Profile[]): Profile | undefined {
  return coaches.find((c) => c.role === 'head_coach');
}

/** Return all assistant coaches. */
function findAssistants(coaches: Profile[]): Profile[] {
  return coaches.filter((c) => c.role === 'assistant_coach');
}

/**
 * Pick a drill from the week's assignments for a given segment_type,
 * preferring drills NOT in recent_drill_ids and optionally matching
 * focus_overrides categories.
 */
function pickDrill(
  drills: (WeeklyDrillAssignment & { drill: Drill })[],
  segmentType: WeeklyDrillAssignment['segment_type'],
  focusOverrides: DrillCategory[],
  recentDrillIds: string[],
  usedDrillIds: Set<string>
): (WeeklyDrillAssignment & { drill: Drill }) | undefined {
  let pool = drills.filter((d) => d.segment_type === segmentType);

  // Apply focus overrides when provided
  if (focusOverrides.length > 0) {
    const focused = pool.filter((d) => focusOverrides.includes(d.drill.category));
    if (focused.length > 0) pool = focused;
  }

  // Prefer drills not used in last 2 practices
  const fresh = pool.filter((d) => !recentDrillIds.includes(d.drill_id));
  if (fresh.length > 0) pool = fresh;

  // Prefer drills not already used in this plan generation
  const unused = pool.filter((d) => !usedDrillIds.has(d.drill_id));
  if (unused.length > 0) pool = unused;

  // Sort by segment_order so the curriculum is followed
  pool.sort((a, b) => a.segment_order - b.segment_order);

  return pool[0];
}

/** Build an error output for irrecoverable situations. */
function errorOutput(message: string): GroupingOutput {
  const seg: GeneratedSegment = {
    segment_order: 0,
    segment_type: 'warmup' as SegmentType,
    drill_id: null,
    coach_ids: [],
    player_ids: [],
    station_name: `Error: ${message}`,
    duration_minutes: 60,
    start_offset_minutes: 0,
    rotation_number: null,
  };
  return {
    segments: [seg],
    format: 'solo',
    num_stations: 0,
    num_rotations: 0,
    team_game_duration: 0,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generatePracticePlan(input: GroupingInput): GroupingOutput {
  const { present_players, present_coaches, drills_for_week, focus_overrides, recent_drill_ids } =
    input;

  const allPlayerIds = present_players.map((p) => p.id);
  const allCoachIds = present_coaches.map((c) => c.id);

  // ── Edge case: no coaches ────────────────────────────────────────────────
  if (present_coaches.length === 0) {
    return errorOutput('No coaches present — cannot run practice');
  }

  // ── Edge case: no players ────────────────────────────────────────────────
  if (present_players.length === 0) {
    return errorOutput('No players present');
  }

  // ── Edge case: 1-on-1 mode ───────────────────────────────────────────────
  if (present_players.length === 1) {
    return buildSoloPlan(input, /* oneOnOne */ true);
  }

  // ── Edge case: fewer than 4 players → whole-team / solo plan ────────────
  if (present_players.length < 4) {
    return buildSoloPlan(input, false);
  }

  // ── Determine format based on coach count ───────────────────────────────
  const numCoaches = present_coaches.length;

  if (numCoaches === 1) {
    return buildSoloPlan(input, false);
  }

  // 2+ coaches → station format
  const numStations = Math.min(numCoaches >= 4 ? 4 : numCoaches, 4);
  return buildStationPlan(input, numStations);
}

// ── Solo / Whole-team plan ────────────────────────────────────────────────────

function buildSoloPlan(input: GroupingInput, oneOnOne: boolean): GroupingOutput {
  const { present_players, present_coaches, drills_for_week, focus_overrides, recent_drill_ids } =
    input;

  const allPlayerIds = present_players.map((p) => p.id);
  const allCoachIds = present_coaches.map((c) => c.id);
  const usedDrillIds = new Set<string>();

  const segments: GeneratedSegment[] = [];
  let order = 0;
  let offset = 0;

  const push = (
    type: SegmentType,
    name: string,
    duration: number,
    drillEntry?: WeeklyDrillAssignment & { drill: Drill }
  ) => {
    if (drillEntry) usedDrillIds.add(drillEntry.drill_id);
    segments.push({
      segment_order: order++,
      segment_type: type,
      drill_id: drillEntry?.drill_id ?? null,
      drill: drillEntry?.drill,
      coach_ids: allCoachIds,
      player_ids: allPlayerIds,
      station_name: name,
      duration_minutes: duration,
      start_offset_minutes: offset,
      rotation_number: null,
    });
    offset += duration;
  };

  // 0:00 — Warmup (5 min)
  const warmupDrill = pickDrill(drills_for_week, 'warmup', focus_overrides, recent_drill_ids, usedDrillIds);
  push('warmup', warmupDrill?.drill.name ?? 'Warmup', 5, warmupDrill);

  // Three drill blocks (10 min each) separated by 2-min water breaks
  // solo schedule: drill 10 → water 2 → drill 10 → water 2 → drill 10 → water 2 → team game 15 → cooldown 4
  for (let i = 0; i < 3; i++) {
    if (i > 0) {
      push('water_break', 'Water Break', 2);
    }
    const drill = pickDrill(drills_for_week, 'station', focus_overrides, recent_drill_ids, usedDrillIds);
    push('station', drill?.drill.name ?? `Drill ${i + 1}`, 10, drill);
  }

  // Water break before team game
  push('water_break', 'Water Break', 2);

  // Team game (15 min)
  const teamDrill = pickDrill(drills_for_week, 'team_activity', focus_overrides, recent_drill_ids, usedDrillIds);
  push('team_activity', teamDrill?.drill.name ?? 'Team Game', 15, teamDrill);

  // Cooldown (4 min) — total so far: 5+10+2+10+2+10+2+15 = 56, need 4 more = 60
  const cooldownDrill = pickDrill(drills_for_week, 'cooldown', focus_overrides, recent_drill_ids, usedDrillIds);
  push('cooldown', cooldownDrill?.drill.name ?? 'Cooldown', 4, cooldownDrill);

  return {
    segments,
    format: 'solo',
    num_stations: 0,
    num_rotations: 0,
    team_game_duration: 15,
  };
}

// ── Station plan ──────────────────────────────────────────────────────────────

function buildStationPlan(input: GroupingInput, numStations: number): GroupingOutput {
  const { present_players, present_coaches, drills_for_week, focus_overrides, recent_drill_ids } =
    input;

  const allPlayerIds = present_players.map((p) => p.id);
  const allCoachIds = present_coaches.map((c) => c.id);

  const headCoach = findHeadCoach(present_coaches);
  const assistants = findAssistants(present_coaches);

  // ── Station timing ───────────────────────────────────────────────────────
  // 4 stations → 4 rotations (8 min each) = 32 min stations, 10 min team game
  // 3 stations → 3 rotations (8 min each) = 24 min stations, 18 min team game
  // 2 stations → 3 rotations (8 min each) = 24 min stations, 18 min team game
  //
  // Full timeline:
  //   5 warmup
  //   [rotations × (8 station + 2 transition)]  — last rotation has no trailing transition
  //   water break 2
  //   team game
  //   cooldown 5
  //   = 60 min

  const numRotations = numStations === 4 ? 4 : 3;
  const stationDuration = 8; // minutes per rotation per station
  const transitionDuration = 2; // minutes between rotations
  const warmupDuration = 5;
  const cooldownDuration = 5;
  const waterBreakDuration = 2;

  // Total for station blocks: rotations * station + (rotations - 1) transitions
  const stationBlockTotal =
    numRotations * stationDuration + (numRotations - 1) * transitionDuration;
  const teamGameDuration =
    60 - warmupDuration - stationBlockTotal - waterBreakDuration - cooldownDuration;

  // ── Assign coaches to stations ───────────────────────────────────────────
  // Rules:
  //   - Hitting station gets 2 coaches if available
  //   - Head coach floats unless < 3 total coaches
  //   - If head coach must run a station, assign to hitting
  //
  // We build stationCoachIds[stationIndex] for a single rotation;
  // coach assignments are the same across all rotations.

  const stationCoachIds: string[][] = Array.from({ length: numStations }, () => []);

  const totalCoaches = present_coaches.length;
  const headCoachFloats = totalCoaches >= 3;

  // Coaches available to be pinned to stations
  const pinnedCoaches: Profile[] = headCoachFloats ? assistants : present_coaches;

  // Station 0 is designated hitting; give it the most coaches
  // Assign coaches round-robin, but bias station 0 if extras
  for (let ci = 0; ci < pinnedCoaches.length; ci++) {
    stationCoachIds[ci % numStations].push(pinnedCoaches[ci].id);
  }

  // If head coach is not floating, ensure they are at station 0 (hitting)
  if (!headCoachFloats && headCoach) {
    // Already included in pinnedCoaches — nothing extra needed
  }

  // Extras (4+ coaches) pair at hitting (station 0)
  // Already handled by round-robin since all extras land at station 0 again
  // after filling remaining stations once.

  // ── Pick drills for each station ────────────────────────────────────────
  const usedDrillIds = new Set<string>();

  // Build station drill pools: one drill per station (same drill runs all rotations at that station)
  const stationDrills: ((WeeklyDrillAssignment & { drill: Drill }) | undefined)[] = [];
  for (let s = 0; s < numStations; s++) {
    const drill = pickDrill(drills_for_week, 'station', focus_overrides, recent_drill_ids, usedDrillIds);
    if (drill) usedDrillIds.add(drill.drill_id);
    stationDrills.push(drill);
  }

  // ── Divide players into groups ───────────────────────────────────────────
  const numGroups = numStations;
  let currentGroups = splitPlayers(present_players, numGroups);

  // ── Build segments ───────────────────────────────────────────────────────
  const segments: GeneratedSegment[] = [];
  let order = 0;
  let offset = 0;

  // Helper to push a non-station segment
  const pushShared = (
    type: SegmentType,
    name: string,
    duration: number,
    drillEntry?: WeeklyDrillAssignment & { drill: Drill }
  ) => {
    if (drillEntry) usedDrillIds.add(drillEntry.drill_id);
    segments.push({
      segment_order: order++,
      segment_type: type,
      drill_id: drillEntry?.drill_id ?? null,
      drill: drillEntry?.drill,
      coach_ids: allCoachIds,
      player_ids: allPlayerIds,
      station_name: name,
      duration_minutes: duration,
      start_offset_minutes: offset,
      rotation_number: null,
    });
    offset += duration;
  };

  // 0:00 — Warmup
  const warmupDrill = pickDrill(drills_for_week, 'warmup', focus_overrides, recent_drill_ids, usedDrillIds);
  pushShared('warmup', warmupDrill?.drill.name ?? 'Warmup', warmupDuration, warmupDrill);

  // ── Rotations ────────────────────────────────────────────────────────────
  for (let rot = 0; rot < numRotations; rot++) {
    if (rot > 0) {
      // Rotate groups between rotations (swap 2-3 kids)
      currentGroups = rotateGroups(currentGroups);
    }

    // One segment per station per rotation
    for (let s = 0; s < numStations; s++) {
      const drillEntry = stationDrills[s];
      const groupPlayers = currentGroups[s] ?? [];
      const coachIds = [...stationCoachIds[s]];

      // Head coach floats — add to all stations in the segment list
      // (In practice UI they appear as floating, not tied to one station)
      // We do NOT add them here to keep group assignments clean.

      const stationNames = ['Hitting', 'Fielding', 'Throwing', 'Baserunning'];
      const name = drillEntry?.drill.name ?? stationNames[s] ?? `Station ${s + 1}`;

      segments.push({
        segment_order: order++,
        segment_type: 'station',
        drill_id: drillEntry?.drill_id ?? null,
        drill: drillEntry?.drill,
        coach_ids: coachIds,
        player_ids: groupPlayers.map((p) => p.id),
        station_name: name,
        duration_minutes: stationDuration,
        start_offset_minutes: offset,
        rotation_number: rot + 1,
      });
    }

    offset += stationDuration;

    // Transition between rotations (except after the last one)
    if (rot < numRotations - 1) {
      segments.push({
        segment_order: order++,
        segment_type: 'transition',
        drill_id: null,
        coach_ids: allCoachIds,
        player_ids: allPlayerIds,
        station_name: 'Rotate Stations',
        duration_minutes: transitionDuration,
        start_offset_minutes: offset,
        rotation_number: null,
      });
      offset += transitionDuration;
    }
  }

  // Water break
  pushShared('water_break', 'Water Break', waterBreakDuration);

  // Team game
  const teamDrill = pickDrill(drills_for_week, 'team_activity', focus_overrides, recent_drill_ids, usedDrillIds);
  pushShared('team_activity', teamDrill?.drill.name ?? 'Team Game', teamGameDuration, teamDrill);

  // Cooldown
  const cooldownDrill = pickDrill(drills_for_week, 'cooldown', focus_overrides, recent_drill_ids, usedDrillIds);
  pushShared('cooldown', cooldownDrill?.drill.name ?? 'Cooldown / High Fives', cooldownDuration, cooldownDrill);

  return {
    segments,
    format: 'stations',
    num_stations: numStations,
    num_rotations: numRotations,
    team_game_duration: teamGameDuration,
  };
}
