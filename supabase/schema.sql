-- ============================================
-- DIAMOND PLANS: Full Database Schema
-- Run this in Supabase SQL Editor AFTER creating auth users
-- ============================================

-- ============================================
-- PROFILES: Extends Supabase auth.users
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('head_coach', 'assistant_coach')),
  email text,
  created_at timestamptz default now()
);

-- ============================================
-- PLAYERS: Kids on the roster
-- ============================================
create table public.players (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  skill_level text not null check (skill_level in ('advanced', 'beginner')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- WEEKLY PLANS: The 12-week curriculum (pre-loaded)
-- week_number IS the primary key
-- ============================================
create table public.weekly_plans (
  week_number int primary key check (week_number between 1 and 12),
  theme text not null,
  focus_skills text[] not null,
  notes text
);

-- ============================================
-- DRILLS: Individual drill definitions
-- ============================================
create table public.drills (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null check (category in ('hitting', 'fielding', 'throwing', 'baserunning', 'game_play', 'warmup', 'cooldown')),
  duration_minutes int not null,
  min_kids int not null default 2,
  max_kids int not null default 6,
  min_coaches int not null default 1,
  max_coaches int not null default 2,
  skill_level_target text not null default 'all' check (skill_level_target in ('all', 'advanced', 'beginner')),
  equipment text[] not null default '{}',
  setup_instructions text not null,
  how_to_explain_to_kids text not null,
  step_by_step text[] not null,
  coaching_points text[] not null,
  common_mistakes text[] not null,
  progressions text not null default '',
  regressions text not null default '',
  fun_factor int not null check (fun_factor between 1 and 5),
  week_introduced int not null default 1,
  created_at timestamptz default now()
);

-- ============================================
-- WEEKLY DRILL ASSIGNMENTS: Which drills belong to which week
-- ============================================
create table public.weekly_drill_assignments (
  id uuid default gen_random_uuid() primary key,
  week_number int not null references weekly_plans(week_number) on delete cascade,
  drill_id uuid not null references drills(id) on delete cascade,
  segment_order int not null,
  segment_type text not null check (segment_type in ('warmup', 'station', 'water_break', 'team_activity', 'cooldown')),
  duration_minutes int not null,
  unique (week_number, segment_order)
);

-- ============================================
-- PRACTICE SESSIONS: One per week, created when head coach starts practice
-- ============================================
create table public.practice_sessions (
  id uuid default gen_random_uuid() primary key,
  week_number int not null references weekly_plans(week_number),
  date date not null default current_date,
  status text not null default 'planning' check (status in ('planning', 'active', 'completed')),
  notes text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Junction table: which players attended this practice
create table public.practice_session_players (
  session_id uuid not null references practice_sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  primary key (session_id, player_id)
);

-- Junction table: which coaches attended this practice
create table public.practice_session_coaches (
  session_id uuid not null references practice_sessions(id) on delete cascade,
  coach_id uuid not null references profiles(id) on delete cascade,
  primary key (session_id, coach_id)
);

-- ============================================
-- STATION ASSIGNMENTS: Generated plan for a practice session
-- ============================================
create table public.station_assignments (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references practice_sessions(id) on delete cascade,
  segment_order int not null,
  segment_type text not null check (segment_type in ('warmup', 'station', 'water_break', 'team_activity', 'cooldown', 'transition')),
  drill_id uuid references drills(id),
  coach_ids uuid[] not null default '{}',
  player_ids uuid[] not null default '{}',
  station_name text not null,
  duration_minutes int not null,
  start_offset_minutes int not null default 0,
  rotation_number int
);

-- ============================================
-- DRILL FEEDBACK: Post-practice notes on individual drills
-- ============================================
create table public.drill_feedback (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references practice_sessions(id) on delete cascade,
  drill_id uuid not null references drills(id),
  rating int check (rating between 1 and 5),
  notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_station_assignments_session on station_assignments(session_id);
create index idx_station_assignments_drill on station_assignments(drill_id);
create index idx_weekly_drill_assignments_week on weekly_drill_assignments(week_number);
create index idx_practice_sessions_week on practice_sessions(week_number);
create index idx_drill_feedback_session on drill_feedback(session_id);
create index idx_drill_feedback_drill on drill_feedback(drill_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.drills enable row level security;
alter table public.weekly_drill_assignments enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_session_players enable row level security;
alter table public.practice_session_coaches enable row level security;
alter table public.station_assignments enable row level security;
alter table public.drill_feedback enable row level security;

-- Helper function to get user role
create or replace function public.get_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer;

-- PROFILES
create policy "Anyone can read profiles" on public.profiles for select using (true);
create policy "Head coach can manage profiles" on public.profiles for all using (get_user_role() = 'head_coach');

-- PLAYERS
create policy "Anyone can read players" on public.players for select using (true);
create policy "Head coach can manage players" on public.players for all using (get_user_role() = 'head_coach');

-- WEEKLY PLANS
create policy "Anyone can read weekly plans" on public.weekly_plans for select using (true);
create policy "Head coach can manage weekly plans" on public.weekly_plans for all using (get_user_role() = 'head_coach');

-- DRILLS
create policy "Anyone can read drills" on public.drills for select using (true);
create policy "Head coach can manage drills" on public.drills for all using (get_user_role() = 'head_coach');

-- WEEKLY DRILL ASSIGNMENTS
create policy "Anyone can read drill assignments" on public.weekly_drill_assignments for select using (true);
create policy "Head coach can manage drill assignments" on public.weekly_drill_assignments for all using (get_user_role() = 'head_coach');

-- PRACTICE SESSIONS
create policy "Anyone can read practice sessions" on public.practice_sessions for select using (true);
create policy "Head coach manages practice sessions" on public.practice_sessions for all using (get_user_role() = 'head_coach');

-- SESSION PLAYERS/COACHES
create policy "Anyone can read session players" on public.practice_session_players for select using (true);
create policy "Head coach manages session players" on public.practice_session_players for all using (get_user_role() = 'head_coach');
create policy "Anyone can read session coaches" on public.practice_session_coaches for select using (true);
create policy "Head coach manages session coaches" on public.practice_session_coaches for all using (get_user_role() = 'head_coach');

-- STATION ASSIGNMENTS
create policy "Anyone can read station assignments" on public.station_assignments for select using (true);
create policy "Head coach manages station assignments" on public.station_assignments for all using (get_user_role() = 'head_coach');

-- DRILL FEEDBACK
create policy "Anyone can read drill feedback" on public.drill_feedback for select using (true);
create policy "Coaches can create drill feedback" on public.drill_feedback for insert with check (auth.uid() = created_by);
create policy "Head coach manages drill feedback" on public.drill_feedback for delete using (get_user_role() = 'head_coach');
