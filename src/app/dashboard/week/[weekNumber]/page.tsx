import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { WeeklyPlan, WeeklyDrillAssignment, Drill } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { removeDrillAssignment, addDrillAssignment, saveWeekNotes } from '@/lib/actions/update-week';

// ── Category display helpers ──────────────────────────────────────────────────

const categoryLabels: Record<Drill['category'], string> = {
  hitting: 'Hitting',
  fielding: 'Fielding',
  throwing: 'Throwing',
  baserunning: 'Baserunning',
  game_play: 'Game Play',
  warmup: 'Warm-Up',
  cooldown: 'Cool-Down',
};

const categoryVariants: Record<
  Drill['category'],
  'advanced' | 'beginner' | 'default' | 'success' | 'warning'
> = {
  hitting: 'advanced',
  fielding: 'success',
  throwing: 'default',
  baserunning: 'warning',
  game_play: 'advanced',
  warmup: 'beginner',
  cooldown: 'beginner',
};

const segmentTypeLabels: Record<string, string> = {
  warmup: 'Warm-Up',
  station: 'Station',
  water_break: 'Water Break',
  team_activity: 'Team Activity',
  cooldown: 'Cool-Down',
};

// ── Remove drill form (inline server action) ──────────────────────────────────

function RemoveDrillForm({
  assignmentId,
  weekNumber,
}: {
  assignmentId: string;
  weekNumber: number;
}) {
  return (
    <form
      action={async () => {
        'use server';
        await removeDrillAssignment(assignmentId, weekNumber);
      }}
    >
      <button
        type="submit"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
        aria-label="Remove drill"
        title="Remove drill"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </button>
    </form>
  );
}

// ── Add drill form ────────────────────────────────────────────────────────────

function AddDrillForm({
  weekNumber,
  availableDrills,
}: {
  weekNumber: number;
  availableDrills: Drill[];
}) {
  return (
    <form action={addDrillAssignment} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <h3 className="font-bold text-[#1e3a5f] text-base">Add a Drill</h3>

      <input type="hidden" name="week_number" value={weekNumber} />

      <div>
        <label htmlFor="drill_id" className="block text-sm font-semibold text-[#1e3a5f] mb-1">
          Drill
        </label>
        <select
          id="drill_id"
          name="drill_id"
          required
          className="w-full rounded-xl border border-gray-300 px-3 text-base bg-white outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          style={{ minHeight: '48px' }}
        >
          <option value="">Select a drill…</option>
          {availableDrills.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({categoryLabels[d.category]}, {d.duration_minutes}m)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="segment_type" className="block text-sm font-semibold text-[#1e3a5f] mb-1">
          Segment Type
        </label>
        <select
          id="segment_type"
          name="segment_type"
          required
          className="w-full rounded-xl border border-gray-300 px-3 text-base bg-white outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          style={{ minHeight: '48px' }}
        >
          <option value="warmup">Warm-Up</option>
          <option value="station">Station</option>
          <option value="team_activity">Team Activity</option>
          <option value="cooldown">Cool-Down</option>
          <option value="water_break">Water Break</option>
        </select>
      </div>

      <div>
        <label htmlFor="duration_minutes" className="block text-sm font-semibold text-[#1e3a5f] mb-1">
          Duration (minutes, optional)
        </label>
        <input
          id="duration_minutes"
          name="duration_minutes"
          type="number"
          min={1}
          max={120}
          placeholder="Use drill default"
          className="w-full rounded-xl border border-gray-300 px-4 text-base outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          style={{ minHeight: '48px' }}
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl font-semibold text-white text-base transition active:opacity-90"
        style={{ backgroundColor: '#1e3a5f', minHeight: '48px' }}
      >
        Add Drill to Week
      </button>
    </form>
  );
}

// ── Notes form ────────────────────────────────────────────────────────────────

function NotesForm({
  weekNumber,
  currentNotes,
}: {
  weekNumber: number;
  currentNotes: string;
}) {
  return (
    <form action={saveWeekNotes} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <h3 className="font-bold text-[#1e3a5f] text-base">Week Notes</h3>
      <input type="hidden" name="week_number" value={weekNumber} />
      <textarea
        name="notes"
        defaultValue={currentNotes}
        rows={4}
        placeholder="Add notes about this week's practice focus…"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
        style={{ minHeight: '96px' }}
      />
      <button
        type="submit"
        className="w-full rounded-xl font-semibold text-white text-base transition active:opacity-90"
        style={{ backgroundColor: '#f97316', minHeight: '48px' }}
      >
        Save Notes
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WeekDetailPage({
  params,
}: {
  params: Promise<{ weekNumber: string }>;
}) {
  const { weekNumber: weekNumberStr } = await params;
  const weekNumber = Number(weekNumberStr);

  if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 12) {
    notFound();
  }

  const supabase = await createClient();

  // Fetch the week plan
  const { data: weekPlan } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('week_number', weekNumber)
    .single<WeeklyPlan>();

  // Fetch drill assignments with full drill data
  const { data: assignments } = await supabase
    .from('weekly_drill_assignments')
    .select('*, drill:drills(*)')
    .eq('week_number', weekNumber)
    .order('segment_order', { ascending: true })
    .returns<(WeeklyDrillAssignment & { drill: Drill | null })[]>();

  // Fetch all drills for the "add drill" picker
  const { data: allDrills } = await supabase
    .from('drills')
    .select('*')
    .order('name', { ascending: true })
    .returns<Drill[]>();

  const drillList = assignments ?? [];
  const totalMinutes = drillList.reduce((sum, a) => sum + a.duration_minutes, 0);

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/dashboard/calendar"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e3a5f] min-h-[48px]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Calendar
      </Link>

      {/* Week header */}
      <div
        className="rounded-2xl px-5 py-5 text-white"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        <p className="text-[#a8c4e0] text-xs font-semibold uppercase tracking-widest mb-1">
          Week {weekNumber} of 12
        </p>
        <h1 className="text-2xl font-bold leading-tight">
          {weekPlan?.theme ?? 'No Theme Set'}
        </h1>
        {weekPlan?.focus_skills && weekPlan.focus_skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {weekPlan.focus_skills.map((skill) => (
              <span
                key={skill}
                className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
        <p className="text-[#a8c4e0] text-sm mt-3">
          {drillList.length} drill{drillList.length !== 1 ? 's' : ''} &middot; {totalMinutes} min total
        </p>
      </div>

      {/* Drill assignments */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
          Assigned Drills ({drillList.length})
        </h2>

        {drillList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-500 text-center">
            No drills assigned yet. Add one below.
          </div>
        ) : (
          <div className="space-y-2">
            {drillList.map((assignment, idx) => (
              <div
                key={assignment.id}
                className="bg-white rounded-xl shadow-sm p-4 flex items-start gap-3"
              >
                {/* Order badge */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: '#1e3a5f' }}
                  aria-hidden="true"
                >
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#1e3a5f] text-sm">
                      {assignment.drill?.name ?? 'Unknown drill'}
                    </p>
                    {assignment.drill && (
                      <Badge variant={categoryVariants[assignment.drill.category]}>
                        {categoryLabels[assignment.drill.category]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{segmentTypeLabels[assignment.segment_type] ?? assignment.segment_type}</span>
                    <span>&middot;</span>
                    <span>{assignment.duration_minutes} min</span>
                    {assignment.drill?.fun_factor && (
                      <>
                        <span>&middot;</span>
                        <span>Fun: {assignment.drill.fun_factor}/5</span>
                      </>
                    )}
                  </div>
                </div>

                <RemoveDrillForm
                  assignmentId={assignment.id}
                  weekNumber={weekNumber}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add drill form */}
      <AddDrillForm weekNumber={weekNumber} availableDrills={allDrills ?? []} />

      {/* Notes form */}
      <NotesForm
        weekNumber={weekNumber}
        currentNotes={weekPlan?.notes ?? ''}
      />
    </div>
  );
}
