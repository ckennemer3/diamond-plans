'use client';

// ============================================================
// /dashboard/post-practice — Post-Practice Wrap-Up Flow
// ============================================================
// URL params: ?session_id=<uuid>&week=<1-12>
// Allows coaches to add session notes and rate each drill,
// then calls the completePractice server action to persist.
// ============================================================

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { completePractice } from '@/lib/actions/complete-practice';
import type { DrillFeedbackInput } from '@/lib/actions/complete-practice';
import type { StationAssignment, Drill, WeeklyPlan } from '@/lib/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

// ── Weekly plan themes (matches seed data) ────────────────────────────────────

const WEEKLY_THEMES: Record<number, string> = {
  1: 'Learning the Diamond',
  2: 'Learning the Diamond',
  3: 'Learning the Diamond',
  4: 'Making Plays',
  5: 'Making Plays',
  6: 'Making Plays',
  7: 'Playing the Game',
  8: 'Playing the Game',
  9: 'Playing the Game',
  10: 'Show What You Know',
  11: 'Show What You Know',
  12: 'Show What You Know',
};

// ── Rating types & helpers ────────────────────────────────────────────────────

type DrillRating = 1 | -1 | null; // thumbs up = 1, thumbs down = -1, skip = null

interface DrillRatingState {
  drill_id: string;
  drill_name: string;
  rating: DrillRating;
}

// ── Thumbs Up / Thumbs Down icons ─────────────────────────────────────────────

function ThumbUpIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ThumbDownIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ── Single drill rating row ───────────────────────────────────────────────────

function DrillRatingRow({
  entry,
  onRate,
}: {
  entry: DrillRatingState;
  onRate: (drill_id: string, rating: DrillRating) => void;
}) {
  const { drill_id, drill_name, rating } = entry;

  const thumbUpActive = rating === 1;
  const thumbDownActive = rating === -1;
  const skipActive = rating === null && false; // "skip" means no choice made yet — handled differently

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1e3a5f] leading-snug truncate pr-2">
          {drill_name}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Thumbs Up */}
        <button
          type="button"
          onClick={() => onRate(drill_id, thumbUpActive ? null : 1)}
          aria-label={`Rate ${drill_name} thumbs up`}
          aria-pressed={thumbUpActive}
          className={[
            'flex items-center justify-center w-11 h-11 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]',
            thumbUpActive
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600',
          ].join(' ')}
        >
          <ThumbUpIcon filled={thumbUpActive} />
        </button>

        {/* Thumbs Down */}
        <button
          type="button"
          onClick={() => onRate(drill_id, thumbDownActive ? null : -1)}
          aria-label={`Rate ${drill_name} thumbs down`}
          aria-pressed={thumbDownActive}
          className={[
            'flex items-center justify-center w-11 h-11 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]',
            thumbDownActive
              ? 'bg-red-100 text-red-600'
              : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500',
          ].join(' ')}
        >
          <ThumbDownIcon filled={thumbDownActive} />
        </button>

        {/* Skip (clear rating) */}
        <button
          type="button"
          onClick={() => onRate(drill_id, null)}
          aria-label={`Skip rating for ${drill_name}`}
          aria-pressed={skipActive}
          className={[
            'flex items-center justify-center w-11 h-11 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]',
            rating === null
              ? 'bg-gray-200 text-gray-500'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500',
          ].join(' ')}
        >
          <SkipIcon />
        </button>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-2xl h-28 bg-gray-200" />
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-20 bg-gray-100 rounded-xl" />
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ── Main inner component (reads search params) ────────────────────────────────

function PostPracticeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get('session_id') ?? '';
  const weekParam = searchParams.get('week');
  const weekNumber = weekParam ? Math.min(Math.max(parseInt(weekParam, 10), 1), 12) : 1;
  const nextWeek = Math.min(weekNumber + 1, 12);
  const nextTheme = WEEKLY_THEMES[nextWeek] ?? 'Show What You Know';

  // ── State ──────────────────────────────────────────────────────────────────

  const [notes, setNotes] = useState('');
  const [drillRatings, setDrillRatings] = useState<DrillRatingState[]>([]);
  const [weekPlan, setWeekPlan] = useState<WeeklyPlan | null>(null);
  // Start in loading state only when we have a session to fetch
  const [isLoading, setIsLoading] = useState(Boolean(sessionId));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch drills used in this session ─────────────────────────────────────

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function loadData() {
      const supabase = createClient();

      // Fetch station assignments for this session (with drill names)
      const { data: assignments } = await supabase
        .from('station_assignments')
        .select('drill_id, drill:drills(id, name)')
        .eq('session_id', sessionId)
        .not('drill_id', 'is', null)
        .returns<(StationAssignment & { drill: Drill | null })[]>();

      // Fetch week plan for theme info
      const { data: plan } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('week_number', weekNumber)
        .single<WeeklyPlan>();

      if (cancelled) return;

      if (plan) setWeekPlan(plan);

      // Deduplicate drills by drill_id
      const seen = new Set<string>();
      const uniqueDrills: DrillRatingState[] = [];
      for (const a of assignments ?? []) {
        if (a.drill_id && a.drill && !seen.has(a.drill_id)) {
          seen.add(a.drill_id);
          uniqueDrills.push({
            drill_id: a.drill_id,
            drill_name: a.drill.name,
            rating: null,
          });
        }
      }

      setDrillRatings(uniqueDrills);
      setIsLoading(false);
    }

    loadData();
    return () => { cancelled = true; };
  }, [sessionId, weekNumber]);

  // ── Rating handler ────────────────────────────────────────────────────────

  const handleRate = useCallback((drill_id: string, rating: DrillRating) => {
    setDrillRatings((prev) =>
      prev.map((r) => (r.drill_id === drill_id ? { ...r, rating } : r))
    );
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleDone() {
    if (!sessionId) {
      toast.error('No session ID found.');
      return;
    }

    setIsSubmitting(true);

    // Build drill_feedback array (only drills that have a rating — skip nulls)
    const drillFeedback: DrillFeedbackInput[] = drillRatings
      .filter((r) => r.rating !== null)
      .map((r) => ({
        drill_id: r.drill_id,
        // Map thumbs up (1) -> rating 5, thumbs down (-1) -> rating 1
        rating: r.rating === 1 ? 5 : 1,
        notes: null,
      }));

    const result = await completePractice({
      session_id: sessionId,
      notes: notes.trim() || null,
      drill_feedback: drillFeedback,
    });

    if (!result.success) {
      toast.error(result.error ?? 'Failed to save practice.');
      setIsSubmitting(false);
      return;
    }

    toast.success('Practice saved! Great work this week.');
    router.push('/dashboard');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-6">
        <p className="text-4xl" aria-hidden="true">🔗</p>
        <p className="font-bold text-[#1e3a5f] text-lg">No session found</p>
        <p className="text-gray-500 text-sm">
          Open this page from the end of a live practice.
        </p>
        <Button variant="secondary" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (isLoading) return <LoadingSkeleton />;

  const theme = weekPlan?.theme ?? WEEKLY_THEMES[weekNumber] ?? 'Season Practice';

  return (
    <div className="space-y-5 pb-6">
      {/* ── Celebration header ───────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-5 py-6 text-white"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        <p className="text-[#f97316] text-2xl font-black mb-1">
          Great practice!
        </p>
        <p className="text-white text-lg font-bold leading-snug">
          Week {weekNumber} of 12 complete.
        </p>
        <p className="text-[#a8c4e0] text-sm mt-1 font-medium">
          {theme}
        </p>
        {weekNumber < 12 && (
          <div className="mt-4 bg-white/10 rounded-xl px-4 py-3">
            <p className="text-[#a8c4e0] text-xs font-semibold uppercase tracking-wider mb-0.5">
              Next Week ({nextWeek} of 12)
            </p>
            <p className="text-white font-bold text-base">{nextTheme}</p>
          </div>
        )}
        {weekNumber === 12 && (
          <div className="mt-4 bg-[#f97316]/20 rounded-xl px-4 py-3">
            <p className="text-[#f97316] font-bold text-base">
              Season complete — amazing job coaching this team!
            </p>
          </div>
        )}
      </div>

      {/* ── Session notes ────────────────────────────────────────────────── */}
      <Card>
        <label
          htmlFor="practice-notes"
          className="block text-sm font-bold text-[#1e3a5f] mb-2"
        >
          Quick notes — what went well?
        </label>
        <textarea
          id="practice-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="e.g. Kids loved the relay drill. Hitting needs more reps next week."
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
          style={{ minHeight: '96px' }}
        />
      </Card>

      {/* ── Drill ratings ────────────────────────────────────────────────── */}
      {drillRatings.length > 0 && (
        <Card>
          <div className="mb-3">
            <h2 className="font-bold text-[#1e3a5f] text-base">Rate the Drills</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Thumbs up, thumbs down, or skip each drill.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 flex items-center justify-center text-emerald-600">
                <ThumbUpIcon filled />
              </span>
              Worked well
            </span>
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 flex items-center justify-center text-red-500">
                <ThumbDownIcon filled />
              </span>
              Needs work
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <SkipIcon />
              Skip
            </span>
          </div>

          <div>
            {drillRatings.map((entry) => (
              <DrillRatingRow
                key={entry.drill_id}
                entry={entry}
                onRate={handleRate}
              />
            ))}
          </div>
        </Card>
      )}

      {drillRatings.length === 0 && (
        <Card>
          <p className="text-sm text-gray-500 text-center py-2">
            No drills found for this practice — notes will still be saved.
          </p>
        </Card>
      )}

      {/* ── Done button ──────────────────────────────────────────────────── */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={isSubmitting}
        onClick={handleDone}
      >
        {isSubmitting ? 'Saving…' : 'Done — Save Practice'}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        fullWidth
        onClick={() => router.push('/dashboard')}
        disabled={isSubmitting}
      >
        Skip and go to Dashboard
      </Button>
    </div>
  );
}

// ── Page export (wrapped in Suspense for useSearchParams) ─────────────────────

function PostPracticeLoading() {
  return (
    <div className="space-y-4 animate-pulse px-0">
      <div className="rounded-2xl h-36 bg-gray-200" />
      <div className="bg-white rounded-xl shadow-sm h-32" />
      <div className="bg-white rounded-xl shadow-sm h-48" />
    </div>
  );
}

export default function PostPracticePage() {
  return (
    <Suspense fallback={<PostPracticeLoading />}>
      <PostPracticeInner />
    </Suspense>
  );
}
