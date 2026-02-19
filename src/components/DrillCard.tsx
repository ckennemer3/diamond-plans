'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Users, Wrench } from 'lucide-react';
import type { Drill, SkillLevel } from '@/lib/types';
import Badge from '@/components/ui/Badge';

interface DrillCardProps {
  drill: Drill;
  playerNames?: string[];
  playerSkillLevels?: SkillLevel[];
  compact?: boolean;
}

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

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-inset rounded min-h-[48px]"
        aria-expanded={open}
      >
        <span className="font-semibold text-[#1e3a5f] text-sm">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

export default function DrillCard({
  drill,
  playerNames,
  playerSkillLevels,
  compact = false,
}: DrillCardProps) {
  // ── Compact mode: used in floating coach overview ──────────────────────────
  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#1e3a5f] text-sm truncate">
            {drill.name}
          </p>
        </div>
        <Badge variant={categoryVariants[drill.category]}>
          {categoryLabels[drill.category]}
        </Badge>
        <div className="flex items-center gap-1 text-gray-500 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{drill.duration_minutes}m</span>
        </div>
      </div>
    );
  }

  // ── Full mode: coaches stare at this during practice ──────────────────────
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#1e3a5f] px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="text-white font-bold text-xl leading-tight">
            {drill.name}
          </h2>
          <Badge variant={categoryVariants[drill.category]}>
            {categoryLabels[drill.category]}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-[#a8c4e0] text-sm">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {drill.duration_minutes} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {drill.min_kids}–{drill.max_kids} players
          </span>
          {drill.skill_level_target !== 'all' && (
            <Badge
              variant={
                drill.skill_level_target === 'advanced' ? 'advanced' : 'beginner'
              }
            >
              {drill.skill_level_target === 'advanced'
                ? '⭐ Advanced'
                : '🟢 Beginner'}
            </Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-1">
        {/* ── How to explain to kids — LARGEST, at top ── */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#f97316] mb-1">
            How to explain to kids
          </p>
          <p className="text-lg font-bold text-gray-900 leading-snug">
            {drill.how_to_explain_to_kids}
          </p>
        </div>

        {/* ── Step-by-step ── */}
        {drill.step_by_step.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Steps
            </p>
            <ol className="space-y-2">
              {drill.step_by_step.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-gray-800 text-sm leading-relaxed">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Coaching points (starts OPEN) ── */}
        {drill.coaching_points.length > 0 && (
          <CollapsibleSection title="Coaching Points" defaultOpen={true}>
            <ul className="space-y-1.5">
              {drill.coaching_points.map((point, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-800">
                  <span className="text-[#f97316] font-bold shrink-0">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* ── Common mistakes (starts COLLAPSED) ── */}
        {drill.common_mistakes.length > 0 && (
          <CollapsibleSection title="Common Mistakes" defaultOpen={false}>
            <ul className="space-y-1.5">
              {drill.common_mistakes.map((mistake, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-800">
                  <span className="text-red-500 font-bold shrink-0">✗</span>
                  {mistake}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* ── Progressions / Regressions (starts COLLAPSED) ── */}
        {(drill.progressions || drill.regressions) && (
          <CollapsibleSection title="Progressions & Regressions" defaultOpen={false}>
            {drill.progressions && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                  Make it harder
                </p>
                <p className="text-sm text-gray-800">{drill.progressions}</p>
              </div>
            )}
            {drill.regressions && (
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  Make it easier
                </p>
                <p className="text-sm text-gray-800">{drill.regressions}</p>
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* ── Equipment ── */}
        {drill.equipment.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Wrench className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Equipment
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {drill.equipment.map((item, i) => (
                <span
                  key={i}
                  className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Setup instructions ── */}
        {drill.setup_instructions && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Setup
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {drill.setup_instructions}
            </p>
          </div>
        )}

        {/* ── Your players ── */}
        {playerNames && playerNames.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Your players
            </p>
            <div className="flex flex-wrap gap-2">
              {playerNames.map((name, i) => {
                const level = playerSkillLevels?.[i];
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1"
                  >
                    <span className="text-sm text-gray-800">{name}</span>
                    {level && (
                      <Badge
                        variant={level === 'advanced' ? 'advanced' : 'beginner'}
                      >
                        {level === 'advanced' ? '⭐' : '🟢'}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
