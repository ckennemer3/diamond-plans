// ============================================
// TypeScript types matching the DB schema
// ============================================

export type UserRole = 'head_coach' | 'assistant_coach';
export type SkillLevel = 'advanced' | 'beginner';
export type DrillCategory = 'hitting' | 'fielding' | 'throwing' | 'baserunning' | 'game_play' | 'warmup' | 'cooldown';
export type SkillLevelTarget = 'all' | 'advanced' | 'beginner';
export type SessionStatus = 'planning' | 'active' | 'completed';
export type SegmentType = 'warmup' | 'station' | 'water_break' | 'team_activity' | 'cooldown' | 'transition';
export type WeeklySegmentType = 'warmup' | 'station' | 'water_break' | 'team_activity' | 'cooldown';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  email: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  skill_level: SkillLevel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlan {
  week_number: number;
  theme: string;
  focus_skills: string[];
  notes: string | null;
}

export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  duration_minutes: number;
  min_kids: number;
  max_kids: number;
  min_coaches: number;
  max_coaches: number;
  skill_level_target: SkillLevelTarget;
  equipment: string[];
  setup_instructions: string;
  how_to_explain_to_kids: string;
  step_by_step: string[];
  coaching_points: string[];
  common_mistakes: string[];
  progressions: string;
  regressions: string;
  fun_factor: number;
  week_introduced: number;
  created_at: string;
}

export interface WeeklyDrillAssignment {
  id: string;
  week_number: number;
  drill_id: string;
  segment_order: number;
  segment_type: WeeklySegmentType;
  duration_minutes: number;
  drill?: Drill;
}

export interface PracticeSession {
  id: string;
  week_number: number;
  date: string;
  status: SessionStatus;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface PracticeSessionPlayer {
  session_id: string;
  player_id: string;
}

export interface PracticeSessionCoach {
  session_id: string;
  coach_id: string;
}

export interface StationAssignment {
  id: string;
  session_id: string;
  segment_order: number;
  segment_type: SegmentType;
  drill_id: string | null;
  coach_ids: string[];
  player_ids: string[];
  station_name: string;
  duration_minutes: number;
  start_offset_minutes: number;
  rotation_number: number | null;
  drill?: Drill;
}

export interface DrillFeedback {
  id: string;
  session_id: string;
  drill_id: string;
  rating: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

// Grouping algorithm types
export interface GroupingInput {
  present_players: Player[];
  present_coaches: Profile[];
  drills_for_week: (WeeklyDrillAssignment & { drill: Drill })[];
  focus_overrides: DrillCategory[];
  week_number: number;
  recent_drill_ids: string[]; // drill IDs used in last 2 practices
}

export interface GeneratedSegment {
  segment_order: number;
  segment_type: SegmentType;
  drill_id: string | null;
  drill?: Drill;
  coach_ids: string[];
  player_ids: string[];
  station_name: string;
  duration_minutes: number;
  start_offset_minutes: number;
  rotation_number: number | null;
}

export interface GroupingOutput {
  segments: GeneratedSegment[];
  format: 'solo' | 'stations';
  num_stations: number;
  num_rotations: number;
  team_game_duration: number;
}

// Cache types
export interface CachedPracticePlan {
  session_id: string;
  week_number: number;
  segments: (StationAssignment & { drill?: Drill })[];
  players: Player[];
  coaches: Profile[];
  cached_at: number; // Date.now() timestamp
}
