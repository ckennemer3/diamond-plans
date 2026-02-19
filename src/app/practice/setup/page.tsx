'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, RefreshCw, Zap } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { generatePlan } from '@/lib/actions/generate-plan';
import { savePlanToSession } from '@/lib/actions/generate-plan';
import { startPractice } from '@/lib/actions/start-practice';
import { savePracticeCache } from '@/lib/cache';

import PlayerChecklist from '@/components/PlayerChecklist';
import CoachChecklist from '@/components/CoachChecklist';
import FocusSelector from '@/components/FocusSelector';
import PracticePlanOverview from '@/components/PracticePlanOverview';
import Button from '@/components/ui/Button';

import type {
  DrillCategory,
  GroupingOutput,
  Player,
  Profile,
} from '@/lib/types';

// ── Weekly plan themes (static fallback while not stored in DB per client) ────
const WEEKLY_THEMES: Record<number, string> = {
  1: 'Introduction & Fundamentals',
  2: 'Throwing Mechanics',
  3: 'Fielding Ground Balls',
  4: 'Hitting Basics',
  5: 'Baserunning Essentials',
  6: 'Infield & Outfield Positioning',
  7: 'Situational Play',
  8: 'Game Simulations',
};

function getWeekTheme(week: number): string {
  return WEEKLY_THEMES[week] ?? `Week ${week} Practice`;
}

// ── Step progress indicator ────────────────────────────────────────────────────

const STEP_LABELS = [
  "Who's here?",
  'Coaches',
  'Focus',
  'Plan',
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div
            className={[
              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors duration-200',
              i < current
                ? 'bg-[#1e3a5f] text-white'
                : i === current
                ? 'bg-[#f97316] text-white'
                : 'bg-gray-200 text-gray-400',
            ].join(' ')}
          >
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={[
                'flex-1 h-0.5 transition-colors duration-200',
                i < current ? 'bg-[#1e3a5f]' : 'bg-gray-200',
              ].join(' ')}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Step header ───────────────────────────────────────────────────────────────

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 pt-2 pb-4">
      <h1 className="text-xl font-bold text-[#1e3a5f]">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PracticeSetupPage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f97316]" /></div>}>
      <PracticeSetupInner />
    </React.Suspense>
  );
}

function PracticeSetupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekNumber = parseInt(searchParams.get('week') ?? '1', 10);

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);

  // ── Step 1: Players ─────────────────────────────────────────────────────────
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  // ── Step 2: Coaches ─────────────────────────────────────────────────────────
  const [allCoaches, setAllCoaches] = useState<Profile[]>([]);
  const [selectedCoachIds, setSelectedCoachIds] = useState<Set<string>>(new Set());
  const [loadingCoaches, setLoadingCoaches] = useState(false);

  // ── Step 3: Focus ────────────────────────────────────────────────────────────
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const useNoFocus = focusAreas.length === 0;

  // ── Step 4: Plan ─────────────────────────────────────────────────────────────
  const [plan, setPlan] = useState<GroupingOutput | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [lockingPlan, setLockingPlan] = useState(false);

  const selectedPlayers = useMemo(
    () => allPlayers.filter((p) => selectedPlayerIds.has(p.id)),
    [allPlayers, selectedPlayerIds]
  );

  const selectedCoaches = useMemo(
    () => allCoaches.filter((c) => selectedCoachIds.has(c.id)),
    [allCoaches, selectedCoachIds]
  );

  // ── Fetch players on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function fetchPlayers() {
      setLoadingPlayers(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        toast.error('Could not load players. Please refresh.');
      } else {
        const players = (data ?? []) as Player[];
        setAllPlayers(players);
        // Pre-select all
        setSelectedPlayerIds(new Set(players.map((p) => p.id)));
      }
      setLoadingPlayers(false);
    }
    fetchPlayers();
  }, []);

  // ── Fetch coaches when entering step 1 ──────────────────────────────────────
  useEffect(() => {
    if (step !== 1) return;
    async function fetchCoaches() {
      setLoadingCoaches(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) {
        toast.error('Could not load coaches. Please refresh.');
      } else {
        const coaches = (data ?? []) as Profile[];
        setAllCoaches(coaches);
        // Pre-select all
        setSelectedCoachIds(new Set(coaches.map((c) => c.id)));
      }
      setLoadingCoaches(false);
    }
    fetchCoaches();
  }, [step]);

  // ── Generate plan ────────────────────────────────────────────────────────────
  const handleGeneratePlan = useCallback(async () => {
    if (selectedPlayerIds.size === 0) {
      toast.error('Select at least one player before generating a plan.');
      return;
    }
    if (selectedCoachIds.size === 0) {
      toast.error('Select at least one coach before generating a plan.');
      return;
    }

    setGeneratingPlan(true);
    try {
      const result = await generatePlan({
        week_number: weekNumber,
        present_player_ids: Array.from(selectedPlayerIds),
        present_coach_ids: Array.from(selectedCoachIds),
        focus_overrides: focusAreas as DrillCategory[],
      });

      if (!result.success) {
        toast.error(result.error ?? 'Failed to generate plan.');
        return;
      }

      setPlan(result.plan);
      setStep(3);
    } catch {
      toast.error('Unexpected error generating plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  }, [selectedPlayerIds, selectedCoachIds, focusAreas, weekNumber]);

  // ── Regenerate ────────────────────────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    setGeneratingPlan(true);
    try {
      const result = await generatePlan({
        week_number: weekNumber,
        present_player_ids: Array.from(selectedPlayerIds),
        present_coach_ids: Array.from(selectedCoachIds),
        focus_overrides: focusAreas as DrillCategory[],
      });

      if (!result.success) {
        toast.error(result.error ?? 'Failed to regenerate plan.');
        return;
      }

      setPlan(result.plan);
      toast.success('Plan regenerated!');
    } catch {
      toast.error('Unexpected error. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  }, [selectedPlayerIds, selectedCoachIds, focusAreas, weekNumber]);

  // ── Lock & Start ──────────────────────────────────────────────────────────────
  const handleLockAndStart = useCallback(async () => {
    if (!plan) return;

    setLockingPlan(true);
    try {
      // 1. Create the practice session
      const startResult = await startPractice({
        week_number: weekNumber,
        present_player_ids: Array.from(selectedPlayerIds),
        present_coach_ids: Array.from(selectedCoachIds),
      });

      if (!startResult.success) {
        toast.error(startResult.error ?? 'Failed to start practice session.');
        return;
      }

      const { session_id } = startResult;

      // 2. Save the plan to the session
      const saveResult = await savePlanToSession({
        session_id,
        segments: plan.segments,
      });

      if (!saveResult.success) {
        toast.error(saveResult.error ?? 'Failed to save plan.');
        return;
      }

      // 3. Save to localStorage cache
      savePracticeCache(session_id, {
        session_id,
        week_number: weekNumber,
        // Cast to StationAssignment shape — segments have the same fields at this stage
        segments: plan.segments as Parameters<typeof savePracticeCache>[1]['segments'],
        players: selectedPlayers,
        coaches: selectedCoaches,
        cached_at: Date.now(),
      });

      // 4. Redirect to live practice
      router.push(`/practice/live?session_id=${session_id}`);
    } catch {
      toast.error('Unexpected error starting practice. Please try again.');
    } finally {
      setLockingPlan(false);
    }
  }, [plan, weekNumber, selectedPlayerIds, selectedCoachIds, selectedPlayers, selectedCoaches, router]);

  // ── Step navigation guards ───────────────────────────────────────────────────
  function handleNextFromStep0() {
    if (selectedPlayerIds.size === 0) {
      toast.error('Select at least one player to continue.');
      return;
    }
    setStep(1);
  }

  function handleNextFromStep1() {
    if (selectedCoachIds.size === 0) {
      toast.error('Select at least one coach to continue.');
      return;
    }
    setStep(2);
  }

  async function handleNextFromStep2() {
    // handleGeneratePlan sets step 3 on success
    await handleGeneratePlan();
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-[#1e3a5f] text-white px-4 py-4 flex items-center gap-3">
        {step > 0 && step < 3 && (
          <button
            type="button"
            onClick={() => setStep((prev) => (prev - 1) as 0 | 1 | 2 | 3)}
            className="p-1 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <p className="text-xs text-[#a8c4e0] font-medium uppercase tracking-wide">
            Practice Setup · Week {weekNumber}
          </p>
          <p className="text-sm font-semibold leading-tight">{getWeekTheme(weekNumber)}</p>
        </div>
      </header>

      {/* Step indicator */}
      <StepIndicator current={step} total={4} />

      {/* Content */}
      <main className="flex-1 pb-6">
        {/* ── Step 0: Players ── */}
        {step === 0 && (
          <div>
            <StepHeader
              title="Who's here today?"
              subtitle="Check off all the players at practice."
            />
            <div className="px-4 space-y-4">
              {loadingPlayers ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <svg
                    className="animate-spin h-8 w-8 mb-3 text-[#1e3a5f]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <p className="text-sm">Loading players…</p>
                </div>
              ) : (
                <PlayerChecklist
                  players={allPlayers}
                  selectedIds={selectedPlayerIds}
                  onChange={setSelectedPlayerIds}
                />
              )}

              <Button
                variant="primary"
                fullWidth
                disabled={loadingPlayers || selectedPlayerIds.size === 0}
                onClick={handleNextFromStep0}
              >
                Next — Coaches
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 1: Coaches ── */}
        {step === 1 && (
          <div>
            <StepHeader
              title="Which coaches are helping?"
              subtitle="Each coach runs one station."
            />
            <div className="px-4 space-y-4">
              {loadingCoaches ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <svg
                    className="animate-spin h-8 w-8 mb-3 text-[#1e3a5f]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <p className="text-sm">Loading coaches…</p>
                </div>
              ) : (
                <CoachChecklist
                  coaches={allCoaches}
                  selectedIds={selectedCoachIds}
                  onChange={setSelectedCoachIds}
                />
              )}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setStep(0)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  disabled={loadingCoaches || selectedCoachIds.size === 0}
                  onClick={handleNextFromStep1}
                  className="flex-[2]"
                >
                  Next — Focus
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Focus ── */}
        {step === 2 && (
          <div>
            <StepHeader
              title="Any focus areas this week?"
              subtitle={`Week ${weekNumber} theme: ${getWeekTheme(weekNumber)}`}
            />
            <div className="px-4 space-y-5">
              {/* "None" default chip */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setFocusAreas([])}
                    aria-pressed={useNoFocus}
                    className={[
                      'inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold min-h-[48px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2',
                      useNoFocus
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:border-[#1e3a5f] hover:text-[#1e3a5f]',
                    ].join(' ')}
                  >
                    None — use the planned practice
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Or select one or more focus areas to override the planned drills:
                </p>
              </div>

              <FocusSelector
                selected={focusAreas}
                onChange={setFocusAreas}
              />

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  loading={generatingPlan}
                  onClick={handleNextFromStep2}
                  className="flex-[2]"
                >
                  <Zap className="w-4 h-4" />
                  Generate Plan
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Plan ── */}
        {step === 3 && (
          <div>
            <StepHeader
              title="Today's Practice Plan"
              subtitle={`Week ${weekNumber} · ${selectedPlayers.length} players · ${selectedCoaches.length} coaches`}
            />
            <div className="px-4 space-y-4">
              {/* Loading state */}
              {generatingPlan && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <svg
                    className="animate-spin h-10 w-10 mb-4 text-[#f97316]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <p className="text-base font-semibold text-[#1e3a5f]">Building your plan…</p>
                  <p className="text-sm text-gray-400 mt-1">Grouping players by skill level</p>
                </div>
              )}

              {/* Plan ready */}
              {!generatingPlan && plan && (
                <>
                  {/* Format summary */}
                  <div className="bg-[#1e3a5f] rounded-xl px-4 py-3 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#a8c4e0] uppercase tracking-wide font-medium">
                          Format
                        </p>
                        <p className="text-sm font-semibold capitalize">
                          {plan.format === 'stations'
                            ? `${plan.num_stations} Stations · ${plan.num_rotations} Rotation${plan.num_rotations !== 1 ? 's' : ''}`
                            : 'Whole-Team Format'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#a8c4e0] uppercase tracking-wide font-medium">
                          Team Game
                        </p>
                        <p className="text-sm font-semibold">
                          {plan.team_game_duration} min
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Segment timeline */}
                  <PracticePlanOverview
                    segments={plan.segments}
                    players={selectedPlayers}
                    coaches={selectedCoaches}
                  />

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="secondary"
                      loading={generatingPlan}
                      onClick={handleRegenerate}
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </Button>
                    <Button
                      variant="primary"
                      loading={lockingPlan}
                      onClick={handleLockAndStart}
                      className="flex-[2] bg-[#f97316] border-[#f97316] hover:bg-[#ea6c09] active:bg-[#d46108]"
                    >
                      <Zap className="w-4 h-4" />
                      Lock &amp; Start
                    </Button>
                  </div>
                </>
              )}

              {/* Error / empty state */}
              {!generatingPlan && !plan && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <p className="text-sm font-medium text-gray-500 mb-3">
                    Could not generate a plan.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStep(2);
                    }}
                  >
                    Go Back
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
