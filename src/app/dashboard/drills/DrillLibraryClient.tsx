'use client';

import React, { useState, useMemo } from 'react';
import type { Drill, DrillCategory } from '@/lib/types';
import DrillCard from '@/components/DrillCard';
import Badge from '@/components/ui/Badge';

// ── Category chip config ──────────────────────────────────────────────────────

type FilterCategory = 'all' | DrillCategory;

const CATEGORY_CHIPS: { value: FilterCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'warmup', label: 'Warm-Up' },
  { value: 'hitting', label: 'Hitting' },
  { value: 'fielding', label: 'Fielding' },
  { value: 'throwing', label: 'Throwing' },
  { value: 'baserunning', label: 'Baserunning' },
  { value: 'game_play', label: 'Game Play' },
  { value: 'cooldown', label: 'Cool-Down' },
];

const categoryVariants: Record<
  DrillCategory,
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

const categoryLabels: Record<DrillCategory, string> = {
  hitting: 'Hitting',
  fielding: 'Fielding',
  throwing: 'Throwing',
  baserunning: 'Baserunning',
  game_play: 'Game Play',
  warmup: 'Warm-Up',
  cooldown: 'Cool-Down',
};

// ── Fun factor stars ──────────────────────────────────────────────────────────

function FunStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Fun factor ${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={i < rating ? '#f97316' : 'none'}
          stroke={i < rating ? '#f97316' : '#d1d5db'}
          strokeWidth={2}
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

// ── Compact drill row (collapsed state) ──────────────────────────────────────

function DrillRow({
  drill,
  expanded,
  onToggle,
}: {
  drill: Drill;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Summary row — tap to expand */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-inset min-h-[64px]"
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#1e3a5f] text-sm">{drill.name}</span>
            <Badge variant={categoryVariants[drill.category]}>
              {categoryLabels[drill.category]}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500">{drill.duration_minutes} min</span>
            <FunStars rating={drill.fun_factor} />
            {drill.skill_level_target !== 'all' && (
              <span className="text-xs text-gray-400">
                {drill.skill_level_target === 'advanced' ? 'Advanced only' : 'Beginners'}
              </span>
            )}
          </div>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded full DrillCard */}
      {expanded && (
        <div className="border-t border-gray-100">
          <DrillCard drill={drill} />
        </div>
      )}
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export default function DrillLibraryClient({ drills }: { drills: Drill[] }) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = drills;
    if (activeCategory !== 'all') {
      result = result.filter((d) => d.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.how_to_explain_to_kids.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [drills, activeCategory, search]);

  function handleToggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setExpandedId(null);
          }}
          placeholder="Search drills…"
          className="w-full rounded-xl border border-gray-300 pl-10 pr-4 text-base outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white"
          style={{ minHeight: '48px' }}
          aria-label="Search drills"
        />
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {CATEGORY_CHIPS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setActiveCategory(value);
              setExpandedId(null);
            }}
            className={[
              'shrink-0 px-3 py-2 rounded-full text-sm font-semibold border transition-colors min-h-[40px]',
              activeCategory === value
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                : 'bg-white text-[#1e3a5f] border-gray-200 hover:bg-gray-50',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-500 font-medium">
        {filtered.length} drill{filtered.length !== 1 ? 's' : ''}
        {search.trim() ? ` matching "${search}"` : ''}
      </p>

      {/* Drill list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center text-sm text-gray-500">
          No drills found. Try adjusting your search or filter.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((drill) => (
            <DrillRow
              key={drill.id}
              drill={drill}
              expanded={expandedId === drill.id}
              onToggle={() => handleToggle(drill.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
