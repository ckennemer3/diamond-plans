import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { WeeklyPlan, PracticeSession } from '@/lib/types';
import Card from '@/components/ui/Card';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calculate the current week number (1–12) based on a fixed season start date.
 * Season starts on the Monday of week 1. Defaults to week 1 if the season
 * hasn't started yet or is over.
 */
function getCurrentWeekNumber(): number {
  // Fixed season start: first Monday on or after March 3, 2025
  const SEASON_START = new Date('2025-03-03T00:00:00');
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = now.getTime() - SEASON_START.getTime();
  if (diff < 0) return 1;
  const weekNumber = Math.floor(diff / msPerWeek) + 1;
  return Math.min(Math.max(weekNumber, 1), 12);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function statusLabel(status: PracticeSession['status']): string {
  switch (status) {
    case 'planning':
      return 'Planning';
    case 'active':
      return 'In Progress';
    case 'completed':
      return 'Completed';
  }
}

function statusColor(status: PracticeSession['status']): string {
  switch (status) {
    case 'planning':
      return '#6b7280';
    case 'active':
      return '#f97316';
    case 'completed':
      return '#22c55e';
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const currentWeek = getCurrentWeekNumber();

  // Fetch current week plan
  const { data: weekPlan } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('week_number', currentWeek)
    .single<WeeklyPlan>();

  // Fetch recent practice sessions (last 5)
  const { data: recentSessions } = await supabase
    .from('practice_sessions')
    .select('*')
    .order('date', { ascending: false })
    .limit(5)
    .returns<PracticeSession[]>();

  return (
    <div className="space-y-6">
      {/* ── Week header ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-5 py-6 text-white"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        <p className="text-[#a8c4e0] text-sm font-semibold uppercase tracking-widest mb-1">
          Week {currentWeek} of 12
        </p>
        <h1 className="text-2xl font-bold leading-tight mb-2">
          {weekPlan?.theme ?? 'Season Practice'}
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
      </div>

      {/* ── Start Practice CTA ──────────────────────────────────────────────── */}
      <Link
        href={`/dashboard/week/${currentWeek}`}
        className="flex items-center justify-center gap-3 w-full rounded-2xl font-bold text-xl text-white min-h-[72px] shadow-lg active:opacity-90 transition-opacity"
        style={{ backgroundColor: '#f97316' }}
      >
        {/* Play icon */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Start Practice
      </Link>

      {/* ── Quick links ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
          Quick Links
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/dashboard/roster" className="block">
            <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-2 min-h-[80px] justify-center hover:shadow-md active:shadow-sm transition-shadow">
              {/* Users icon */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e3a5f"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-xs font-semibold text-[#1e3a5f]">Roster</span>
            </div>
          </Link>

          <Link href="/dashboard/calendar" className="block">
            <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-2 min-h-[80px] justify-center hover:shadow-md active:shadow-sm transition-shadow">
              {/* Calendar icon */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e3a5f"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-xs font-semibold text-[#1e3a5f]">Calendar</span>
            </div>
          </Link>

          <Link href="/dashboard/drills" className="block">
            <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-2 min-h-[80px] justify-center hover:shadow-md active:shadow-sm transition-shadow">
              {/* BookOpen icon */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e3a5f"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span className="text-xs font-semibold text-[#1e3a5f]">Drills</span>
            </div>
          </Link>
        </div>

        {/* Season Summary — full-width link */}
        <Link href="/dashboard/season-summary" className="block mt-3">
          <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4 hover:shadow-md active:shadow-sm transition-shadow">
            {/* Trophy / chart icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#f97316' }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#1e3a5f] text-sm">Season Summary</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Attendance, drill ratings &amp; notes
              </p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      </div>

      {/* ── Recent practice sessions ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
          Recent Practices
        </h2>

        {recentSessions && recentSessions.length > 0 ? (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <Card key={session.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#1e3a5f] text-sm">
                      Week {session.week_number}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(session.date)}
                    </p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${statusColor(session.status)}20`,
                      color: statusColor(session.status),
                    }}
                  >
                    {statusLabel(session.status)}
                  </span>
                </div>
                {session.notes && (
                  <p className="text-xs text-gray-600 mt-2 line-clamp-1">{session.notes}</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-gray-500 text-center py-2">
              No practice sessions yet. Start your first practice!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
