import { createClient } from '@supabase/supabase-js';
import { warmupDrills } from './drills-warmup';
import { hittingDrills } from './drills-hitting';
import { fieldingDrills } from './drills-fielding';
import { throwingDrills } from './drills-throwing';
import { baserunningDrills } from './drills-baserunning';
import { gameplayDrills } from './drills-gameplay';
import { cooldownDrills } from './drills-cooldown';
import { extraDrills } from './drills-extra';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================
// COACHES
// ============================================
const coaches = [
  { full_name: 'Chase', role: 'head_coach', email: 'chase@diamondplans.app' },
  { full_name: 'Mike', role: 'assistant_coach', email: 'mike@diamondplans.app' },
  { full_name: 'Derek', role: 'assistant_coach', email: 'derek@diamondplans.app' },
  { full_name: 'Jason', role: 'assistant_coach', email: 'jason@diamondplans.app' },
  { full_name: 'Scott', role: 'assistant_coach', email: 'scott@diamondplans.app' },
  { full_name: 'Brian', role: 'assistant_coach', email: 'brian@diamondplans.app' },
  { full_name: 'Kyle', role: 'assistant_coach', email: 'kyle@diamondplans.app' },
];

// ============================================
// PLAYERS (12 boys)
// ============================================
const players = [
  { name: 'Liam', skill_level: 'advanced' },
  { name: 'Noah', skill_level: 'advanced' },
  { name: 'Ethan', skill_level: 'advanced' },
  { name: 'Jack', skill_level: 'advanced' },
  { name: 'Owen', skill_level: 'advanced' },
  { name: 'Mason', skill_level: 'advanced' },
  { name: 'Cooper', skill_level: 'beginner' },
  { name: 'Wyatt', skill_level: 'beginner' },
  { name: 'Luke', skill_level: 'beginner' },
  { name: 'Carter', skill_level: 'beginner' },
  { name: 'Brady', skill_level: 'beginner' },
  { name: 'Finn', skill_level: 'beginner' },
];

// ============================================
// WEEKLY PLANS (12 weeks)
// ============================================
const weeklyPlans = [
  { week_number: 1, theme: 'Learning the Diamond', focus_skills: ['batting stance', 'grip the bat', 'what bases are', 'catch basics'], notes: 'Week 1 — keep it fun! Maximum fun_factor drills. Focus on movement and engagement over technique.' },
  { week_number: 2, theme: 'Learning the Diamond', focus_skills: ['tee hitting', 'throwing basics', 'fielding ready position', 'base recognition'], notes: 'Introduce alligator chomp for fielding. Step and fire for throwing.' },
  { week_number: 3, theme: 'Learning the Diamond', focus_skills: ['catch and throw', 'tee hitting consistency', 'running bases in order'], notes: 'Last foundation week. Kids should know the bases and basic positions by now.' },
  { week_number: 4, theme: 'Making Plays', focus_skills: ['coach-pitch hitting', 'fielding grounders', 'throwing to a target'], notes: 'Transition from tee to coach pitch. 3 pitches then 2 tee swings format.' },
  { week_number: 5, theme: 'Making Plays', focus_skills: ['fielding and throwing combo', 'running bases', 'crow hop throw'], notes: 'Combine fielding and throwing — scoop and throw to first.' },
  { week_number: 6, theme: 'Making Plays', focus_skills: ['coach-pitch consistency', 'fielding fly balls', 'base running decisions'], notes: 'First scrimmage-lite game this week. Keep it simple and fun.' },
  { week_number: 7, theme: 'Playing the Game', focus_skills: ['fielding and throwing to first', 'hitting coach-pitch', 'game situations'], notes: 'Introduce situation ball — where do you throw it?' },
  { week_number: 8, theme: 'Playing the Game', focus_skills: ['hitting consistency', 'base running', 'position play basics'], notes: 'First World Series game. Every kid bats every inning.' },
  { week_number: 9, theme: 'Playing the Game', focus_skills: ['game defense', 'situational hitting', 'team play'], notes: 'Focus on where to throw the ball in game situations.' },
  { week_number: 10, theme: 'Show What You Know', focus_skills: ['full game situations', 'position play', 'team defense'], notes: 'Game-simulation focused. Kids should be able to field and throw to the right base.' },
  { week_number: 11, theme: 'Show What You Know', focus_skills: ['scrimmage', 'positions', 'game flow'], notes: 'Full scrimmages with positions. Keep coaching light — let them play.' },
  { week_number: 12, theme: 'Show What You Know', focus_skills: ['championship game', 'celebration', 'season review'], notes: 'Last practice! Fun World Series game. Celebrate the whole season. Awards for every kid.' },
];

// ============================================
// COMBINE ALL DRILLS
// ============================================
const allDrills = [
  ...warmupDrills,
  ...hittingDrills,
  ...fieldingDrills,
  ...throwingDrills,
  ...baserunningDrills,
  ...gameplayDrills,
  ...cooldownDrills,
  ...extraDrills,
];

// ============================================
// WEEKLY DRILL ASSIGNMENTS
// Maps drills to weeks following the practice structure
// Each week gets: 1 warmup, 4 station drills, 1 team game, 1 cooldown
// Respects the 3x repetition limit across 12 weeks
// ============================================
function buildWeeklyAssignments(drillMap: Map<string, string>) {
  // Helper to get drill ID by name
  const id = (name: string) => {
    const drillId = drillMap.get(name);
    if (!drillId) throw new Error(`Drill not found: ${name}`);
    return drillId;
  };

  // Each week assignment: [warmup, station1, station2, station3, station4, team_game, cooldown]
  // segment_order: 1=warmup, 2-5=stations, 6=team_game, 7=cooldown
  const weekDrills: Record<number, { drill: string; segment_type: string; duration: number }[]> = {
    1: [
      { drill: 'Coach Says', segment_type: 'warmup', duration: 5 },
      { drill: 'Tee Ball Blast', segment_type: 'station', duration: 8 },
      { drill: 'Hot Potato Grounders', segment_type: 'station', duration: 8 },
      { drill: 'Rocket Arm Challenge', segment_type: 'station', duration: 7 },
      { drill: 'Home to First Sprint', segment_type: 'station', duration: 7 },
      { drill: 'Freeze Tag Bases', segment_type: 'team_activity', duration: 10 },
      { drill: 'Team Cheer', segment_type: 'cooldown', duration: 5 },
    ],
    2: [
      { drill: 'Superhero Stretches', segment_type: 'warmup', duration: 5 },
      { drill: 'Beat Your Score', segment_type: 'station', duration: 8 },
      { drill: 'Barehand Catch', segment_type: 'station', duration: 7 },
      { drill: 'Target Throw', segment_type: 'station', duration: 7 },
      { drill: 'Traffic Light', segment_type: 'station', duration: 7 },
      { drill: 'Relay Race Throw', segment_type: 'team_activity', duration: 10 },
      { drill: 'High Five Line', segment_type: 'cooldown', duration: 5 },
    ],
    3: [
      { drill: 'Base Race', segment_type: 'warmup', duration: 5 },
      { drill: 'Tee Ball Blast', segment_type: 'station', duration: 8 },
      { drill: 'Fly Ball Frenzy', segment_type: 'station', duration: 7 },
      { drill: 'Partner Toss', segment_type: 'station', duration: 7 },
      { drill: 'Home to First Sprint', segment_type: 'station', duration: 7 },
      { drill: 'Freeze Tag Bases', segment_type: 'team_activity', duration: 10 },
      { drill: 'Team Cheer', segment_type: 'cooldown', duration: 5 },
    ],
    4: [
      { drill: 'Dizzy Bases', segment_type: 'warmup', duration: 5 },
      { drill: 'Coach Pitch Challenge', segment_type: 'station', duration: 8 },
      { drill: 'Scoop and Score', segment_type: 'station', duration: 7 },
      { drill: 'Target Throw', segment_type: 'station', duration: 7 },
      { drill: 'Base Circuit', segment_type: 'station', duration: 7 },
      { drill: 'Pickle', segment_type: 'team_activity', duration: 12 },
      { drill: 'Team Circle Talk', segment_type: 'cooldown', duration: 5 },
    ],
    5: [
      { drill: 'Crazy Cones', segment_type: 'warmup', duration: 5 },
      { drill: 'Wiffle Ball Derby', segment_type: 'station', duration: 8 },
      { drill: 'Hot Potato Grounders', segment_type: 'station', duration: 7 },
      { drill: 'Step and Throw', segment_type: 'station', duration: 7 },
      { drill: 'Dive and Slide', segment_type: 'station', duration: 7 },
      { drill: 'Relay Race Throw', segment_type: 'team_activity', duration: 10 },
      { drill: 'High Five Line', segment_type: 'cooldown', duration: 5 },
    ],
    6: [
      { drill: 'Coach Says', segment_type: 'warmup', duration: 5 },
      { drill: 'Coach Pitch Challenge', segment_type: 'station', duration: 8 },
      { drill: 'Wall Ball', segment_type: 'station', duration: 7 },
      { drill: 'Knee Throws', segment_type: 'station', duration: 6 },
      { drill: 'Traffic Light', segment_type: 'station', duration: 7 },
      { drill: 'Scrimmage-Lite', segment_type: 'team_activity', duration: 15 },
      { drill: 'Team Cheer', segment_type: 'cooldown', duration: 5 },
    ],
    7: [
      { drill: 'Superhero Stretches', segment_type: 'warmup', duration: 5 },
      { drill: 'Target Hitting', segment_type: 'station', duration: 8 },
      { drill: 'Triangle Toss', segment_type: 'station', duration: 7 },
      { drill: 'Rocket Arm Challenge', segment_type: 'station', duration: 7 },
      { drill: 'Base Circuit', segment_type: 'station', duration: 7 },
      { drill: 'Situation Ball', segment_type: 'team_activity', duration: 10 },
      { drill: 'Team Circle Talk', segment_type: 'cooldown', duration: 5 },
    ],
    8: [
      { drill: 'Base Race', segment_type: 'warmup', duration: 5 },
      { drill: 'Switch Hitter Fun', segment_type: 'station', duration: 7 },
      { drill: 'Dive and Slide', segment_type: 'station', duration: 7 },
      { drill: 'Partner Toss', segment_type: 'station', duration: 7 },
      { drill: 'Home to First Sprint', segment_type: 'station', duration: 7 },
      { drill: 'World Series', segment_type: 'team_activity', duration: 15 },
      { drill: 'Team Cheer', segment_type: 'cooldown', duration: 5 },
    ],
    9: [
      { drill: 'Dizzy Bases', segment_type: 'warmup', duration: 5 },
      { drill: 'Coach Pitch Challenge', segment_type: 'station', duration: 8 },
      { drill: 'Scoop and Score', segment_type: 'station', duration: 7 },
      { drill: 'Step and Throw', segment_type: 'station', duration: 7 },
      { drill: 'Base Circuit', segment_type: 'station', duration: 7 },
      { drill: 'Situation Ball', segment_type: 'team_activity', duration: 10 },
      { drill: 'High Five Line', segment_type: 'cooldown', duration: 5 },
    ],
    10: [
      { drill: 'Crazy Cones', segment_type: 'warmup', duration: 5 },
      { drill: 'Wiffle Ball Derby', segment_type: 'station', duration: 8 },
      { drill: 'Fly Ball Frenzy', segment_type: 'station', duration: 7 },
      { drill: 'Rocket Arm Challenge', segment_type: 'station', duration: 7 },
      { drill: 'Traffic Light', segment_type: 'station', duration: 7 },
      { drill: 'Scrimmage-Lite', segment_type: 'team_activity', duration: 15 },
      { drill: 'Team Cheer', segment_type: 'cooldown', duration: 5 },
    ],
    11: [
      { drill: 'Coach Says', segment_type: 'warmup', duration: 5 },
      { drill: 'Target Hitting', segment_type: 'station', duration: 8 },
      { drill: 'Wall Ball', segment_type: 'station', duration: 7 },
      { drill: 'Partner Toss', segment_type: 'station', duration: 7 },
      { drill: 'Batting Stance Freeze', segment_type: 'station', duration: 7 },
      { drill: 'World Series', segment_type: 'team_activity', duration: 15 },
      { drill: 'Team Circle Talk', segment_type: 'cooldown', duration: 5 },
    ],
    12: [
      { drill: 'Superhero Stretches', segment_type: 'warmup', duration: 5 },
      { drill: 'Beat Your Score', segment_type: 'station', duration: 8 },
      { drill: 'Barehand Catch', segment_type: 'station', duration: 7 },
      { drill: 'Target Throw', segment_type: 'station', duration: 7 },
      { drill: 'Freeze Tag Bases', segment_type: 'station', duration: 8 },
      { drill: 'World Series', segment_type: 'team_activity', duration: 15 },
      { drill: 'Team Cheer', segment_type: 'cooldown', duration: 5 },
    ],
  };

  const assignments: {
    week_number: number;
    drill_id: string;
    segment_order: number;
    segment_type: string;
    duration_minutes: number;
  }[] = [];

  for (const [week, drills] of Object.entries(weekDrills)) {
    drills.forEach((d, index) => {
      assignments.push({
        week_number: parseInt(week),
        drill_id: id(d.drill),
        segment_order: index + 1,
        segment_type: d.segment_type,
        duration_minutes: d.duration,
      });
    });
  }

  return assignments;
}

// ============================================
// MAIN SEED FUNCTION
// ============================================
async function seed() {
  console.log('🌱 Starting seed...');
  console.log(`📊 Total drills to insert: ${allDrills.length}`);

  // 1. Insert players
  console.log('\n👦 Inserting players...');
  const { data: insertedPlayers, error: playersError } = await supabase
    .from('players')
    .upsert(
      players.map(p => ({ ...p, is_active: true })),
      { onConflict: 'name', ignoreDuplicates: true }
    )
    .select();

  // If upsert by name doesn't work (no unique constraint on name), try insert
  if (playersError) {
    console.log('  Trying direct insert (players may already exist)...');
    const { error: insertError } = await supabase.from('players').insert(
      players.map(p => ({ ...p, is_active: true }))
    );
    if (insertError && !insertError.message.includes('duplicate')) {
      console.error('  ❌ Error inserting players:', insertError.message);
    }
  }
  // Fetch all players to get IDs
  const { data: allPlayers } = await supabase.from('players').select('*');
  console.log(`  ✅ ${allPlayers?.length || 0} players in database`);

  // 2. Link coaches to auth users → profiles
  console.log('\n🧑‍🏫 Linking coaches to profiles...');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  if (!authUsers?.users?.length) {
    console.error('  ❌ No auth users found. Create them in Supabase Auth first!');
    console.error('  Go to Authentication → Users → Create user for each coach.');
    console.error('  Emails: chase@diamondplans.app, mike@diamondplans.app, etc.');
    console.error('  Password: diamond2025!');
  } else {
    for (const coach of coaches) {
      const authUser = authUsers.users.find(u => u.email === coach.email);
      if (authUser) {
        const { error } = await supabase.from('profiles').upsert({
          id: authUser.id,
          full_name: coach.full_name,
          role: coach.role,
          email: coach.email,
        }, { onConflict: 'id' });
        if (error) {
          console.error(`  ❌ Error linking ${coach.full_name}:`, error.message);
        } else {
          console.log(`  ✅ ${coach.full_name} (${coach.role})`);
        }
      } else {
        console.warn(`  ⚠️  No auth user found for ${coach.email} — create them in Supabase Auth first`);
      }
    }
  }

  // 3. Insert drills
  console.log('\n⚾ Inserting drills...');
  const drillsToInsert = allDrills.map(d => ({
    name: d.name,
    category: d.category,
    duration_minutes: d.duration_minutes,
    min_kids: d.min_kids,
    max_kids: d.max_kids,
    min_coaches: d.min_coaches,
    max_coaches: d.max_coaches,
    skill_level_target: d.skill_level_target,
    equipment: d.equipment,
    setup_instructions: d.setup_instructions,
    how_to_explain_to_kids: d.how_to_explain_to_kids,
    step_by_step: d.step_by_step,
    coaching_points: d.coaching_points,
    common_mistakes: d.common_mistakes,
    progressions: d.progressions,
    regressions: d.regressions,
    fun_factor: d.fun_factor,
    week_introduced: d.week_introduced,
  }));

  // Delete existing drills and re-insert (idempotent)
  const { data: existingDrills } = await supabase.from('drills').select('id');
  if (existingDrills && existingDrills.length > 0) {
    console.log(`  Found ${existingDrills.length} existing drills. Clearing and re-inserting...`);
    // First clear weekly_drill_assignments that reference drills
    await supabase.from('weekly_drill_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('drills').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { data: insertedDrills, error: drillsError } = await supabase
    .from('drills')
    .insert(drillsToInsert)
    .select();

  if (drillsError) {
    console.error('  ❌ Error inserting drills:', drillsError.message);
    return;
  }
  console.log(`  ✅ ${insertedDrills?.length || 0} drills inserted`);

  // Build drill name → ID map
  const drillMap = new Map<string, string>();
  insertedDrills?.forEach(d => drillMap.set(d.name, d.id));

  // Validate all drill names are in the map
  console.log('\n🔍 Validating drill references...');
  let missingDrills = false;
  for (const drill of allDrills) {
    if (!drillMap.has(drill.name)) {
      console.error(`  ❌ Missing drill in database: ${drill.name}`);
      missingDrills = true;
    }
  }
  if (!missingDrills) {
    console.log('  ✅ All drill references valid');
  }

  // 4. Insert weekly plans
  console.log('\n📅 Inserting weekly plans...');
  // Clear existing weekly plans first
  await supabase.from('weekly_plans').delete().gte('week_number', 1);

  const { error: weeklyError } = await supabase
    .from('weekly_plans')
    .insert(weeklyPlans);

  if (weeklyError) {
    console.error('  ❌ Error inserting weekly plans:', weeklyError.message);
  } else {
    console.log('  ✅ 12 weekly plans inserted');
  }

  // 5. Insert weekly drill assignments
  console.log('\n📋 Inserting weekly drill assignments...');
  try {
    const assignments = buildWeeklyAssignments(drillMap);
    const { error: assignError } = await supabase
      .from('weekly_drill_assignments')
      .insert(assignments);

    if (assignError) {
      console.error('  ❌ Error inserting assignments:', assignError.message);
    } else {
      console.log(`  ✅ ${assignments.length} drill assignments inserted across 12 weeks`);
    }
  } catch (e) {
    console.error('  ❌ Error building assignments:', (e as Error).message);
  }

  // 6. Validate drill repetition rule (no drill more than 3x)
  console.log('\n🔄 Checking repetition rule (max 3x per drill)...');
  const drillUsageCounts = new Map<string, number>();
  for (const [, drills] of Object.entries({
    1: ['Coach Says', 'Tee Ball Blast', 'Hot Potato Grounders', 'Rocket Arm Challenge', 'Home to First Sprint', 'Freeze Tag Bases', 'Team Cheer'],
    2: ['Superhero Stretches', 'Beat Your Score', 'Barehand Catch', 'Target Throw', 'Traffic Light', 'Relay Race Throw', 'High Five Line'],
    3: ['Base Race', 'Tee Ball Blast', 'Fly Ball Frenzy', 'Partner Toss', 'Home to First Sprint', 'Freeze Tag Bases', 'Team Cheer'],
    4: ['Dizzy Bases', 'Coach Pitch Challenge', 'Scoop and Score', 'Target Throw', 'Base Circuit', 'Pickle', 'Team Circle Talk'],
    5: ['Crazy Cones', 'Wiffle Ball Derby', 'Hot Potato Grounders', 'Step and Throw', 'Dive and Slide', 'Relay Race Throw', 'High Five Line'],
    6: ['Coach Says', 'Coach Pitch Challenge', 'Wall Ball', 'Knee Throws', 'Traffic Light', 'Scrimmage-Lite', 'Team Cheer'],
    7: ['Superhero Stretches', 'Target Hitting', 'Triangle Toss', 'Rocket Arm Challenge', 'Base Circuit', 'Situation Ball', 'Team Circle Talk'],
    8: ['Base Race', 'Switch Hitter Fun', 'Dive and Slide', 'Partner Toss', 'Home to First Sprint', 'World Series', 'Team Cheer'],
    9: ['Dizzy Bases', 'Coach Pitch Challenge', 'Scoop and Score', 'Step and Throw', 'Base Circuit', 'Situation Ball', 'High Five Line'],
    10: ['Crazy Cones', 'Wiffle Ball Derby', 'Fly Ball Frenzy', 'Rocket Arm Challenge', 'Traffic Light', 'Scrimmage-Lite', 'Team Cheer'],
    11: ['Coach Says', 'Target Hitting', 'Wall Ball', 'Partner Toss', 'Batting Stance Freeze', 'World Series', 'Team Circle Talk'],
    12: ['Superhero Stretches', 'Beat Your Score', 'Barehand Catch', 'Target Throw', 'Freeze Tag Bases', 'World Series', 'Team Cheer'],
  })) {
    for (const drill of drills) {
      drillUsageCounts.set(drill, (drillUsageCounts.get(drill) || 0) + 1);
    }
  }

  let repetitionViolations = false;
  for (const [drill, count] of drillUsageCounts.entries()) {
    if (count > 3) {
      // Cooldowns and warmups get a pass — they're repeated more by design
      const drillData = allDrills.find(d => d.name === drill);
      if (drillData && drillData.category !== 'warmup' && drillData.category !== 'cooldown') {
        console.warn(`  ⚠️  ${drill} used ${count} times (max 3 for station/game drills)`);
        repetitionViolations = true;
      }
    }
  }
  if (!repetitionViolations) {
    console.log('  ✅ All station/game drills within 3x limit');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('🎉 SEED COMPLETE!');
  console.log('='.repeat(50));
  console.log(`  Players: ${allPlayers?.length || 0}`);
  console.log(`  Drills: ${insertedDrills?.length || 0}`);
  console.log(`  Weekly Plans: 12`);
  console.log(`  Categories: warmup(${warmupDrills.length}), hitting(${hittingDrills.length}), fielding(${fieldingDrills.length}), throwing(${throwingDrills.length}), baserunning(${baserunningDrills.length}), gameplay(${gameplayDrills.length}), cooldown(${cooldownDrills.length})`);
  console.log('\n  Next steps:');
  console.log('  1. Verify data in Supabase dashboard');
  console.log('  2. Create auth users if not done yet');
  console.log('  3. Run: npx next build');
}

seed().catch(console.error);
