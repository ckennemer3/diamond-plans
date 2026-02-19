import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { WeeklyPlan, WeeklyDrillAssignment, Drill } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCurrentWeekNumber(): number {
  const SEASON_START = new Date('2025-03-03T00:00:00');
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = now.getTime() - SEASON_START.getTime();
  if (diff < 0) return 1;
  const weekNumber = Math.floor(diff / msPerWeek) + 1;
  return Math.min(Math.max(weekNumber, 1), 12);
}

function weekStatus(
  weekNumber: number,
  currentWeek: number
): 'past' | 'current' | 'future' {
  if (weekNumber < currentWeek) return 'past';
  if (weekNumber === currentWeek) return 'current';
  return 'future';
}

type WeekPlanWithDrills = WeeklyPlan & {
  assignments: (WeeklyDrillAssignment & { drill: Drill | null })[];
};

// ── Week card ─────────────────────────────────────────────────────────────────

function WeekCard({
  weekNumber,
  plan,
  assignments,
  status,
}: {
  weekNumber: number;
  plan: WeeklyPlan | null;
  assignments: (WeeklyDrillAssignment & { drill: Drill | null })[];
  status: 'past' | 'current' | 'future';
}) {
  const borderColor =
    status === 'current'
      ? '#f97316'
      : status === 'past'
        ? '#22c55e'
        : '#e5e7eb';

  const labelColor =
    status === 'current'
      ? '#f97316'
      : status === 'past'
        ? '#22c55e'
        : '#9ca3af';

  const labelText =
    status === 'current' ? 'This Week' : status === 'past' ? 'Completed' : '';

  return (
    <Link href={`/dashboard/week/${weekNumber}`} className="block">
      <div
        className="bg-white rounded-xl shadow-sm p-4 transition-shadow hover:shadow-md active:shadow-sm border-l-4"
        style={{ borderLeftColor: borderColor }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Week {weekNumber}
              </span>
              {labelText && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    color: labelColor,
                    backgroundColor: `${labelColor}18`,
                  }}
                >
                  {labelText}
                </span>
              )}
            </div>
            <h3 className="font-bold text-[#1e3a5f] text-base mt-0.5">
              {plan?.theme ?? 'No theme set'}
            </h3>
          </div>

          {/* Chevron */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 mt-1"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* Focus skills */}
        {plan?.focus_skills && plan.focus_skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {plan.focus_skills.map((skill) => (
              <span
                key={skill}
                className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Drill list */}
        {assignments.length > 0 && (
          <div className="mt-2 space-y-1">
            {assignments.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: borderColor }}
                  aria-hidden="true"
                />
                <span className="text-xs text-gray-600 truncate">
                  {a.drill?.name ?? 'Unknown drill'}{' '}
                  <span className="text-gray-400">({a.duration_minutes}m)</span>
                </span>
              </div>
            ))}
            {assignments.length > 3 && (
              <p className="text-xs text-gray-400 pl-3.5">
                +{assignments.length - 3} more drill{assignments.length - 3 !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {assignments.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">No drills assigned yet</p>
        )}
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CalendarPage() {
  const supabase = await createClient();
  const currentWeek = getCurrentWeekNumber();

  // Fetch all weekly plans
  const { data: weeklyPlans } = await supabase
    .from('weekly_plans')
    .select('*')
    .order('week_number', { ascending: true })
    .returns<WeeklyPlan[]>();

  // Fetch all drill assignments with drill data
  const { data: allAssignments } = await supabase
    .from('weekly_drill_assignments')
    .select('*, drill:drills(*)')
    .order('segment_order', { ascending: true })
    .returns<(WeeklyDrillAssignment & { drill: Drill | null })[]>();

  // Build a map: weekNumber → { plan, assignments }
  const planMap = new Map<number, WeeklyPlan>(
    weeklyPlans?.map((p) => [p.week_number, p]) ?? []
  );

  const assignmentMap = new Map<
    number,
    (WeeklyDrillAssignment & { drill: Drill | null })[]
  >();
  for (const a of allAssignments ?? []) {
    const arr = assignmentMap.get(a.week_number) ?? [];
    arr.push(a);
    assignmentMap.set(a.week_number, arr);
  }

  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Season Calendar</h1>
        <p className="text-sm text-gray-500 mt-0.5">12-week practice plan</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" aria-hidden="true" />
          Past
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ backgroundColor: '#f97316' }}
            aria-hidden="true"
          />
          This Week
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-300 inline-block" aria-hidden="true" />
          Upcoming
        </span>
      </div>

      {/* Week cards */}
      <div className="space-y-3">
        {weeks.map((weekNumber) => (
          <WeekCard
            key={weekNumber}
            weekNumber={weekNumber}
            plan={planMap.get(weekNumber) ?? null}
            assignments={assignmentMap.get(weekNumber) ?? []}
            status={weekStatus(weekNumber, currentWeek)}
          />
        ))}
      </div>
    </div>
  );
}
