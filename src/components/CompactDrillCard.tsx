'use client';

// ============================================
// CompactDrillCard — floating coach overview card
// ============================================

import React from 'react';
import { Clock, User } from 'lucide-react';
import type { Drill, Player, Profile, SkillLevel } from '@/lib/types';
import Badge from '@/components/ui/Badge';

// ---- Category helpers (mirrors DrillCard) --------------------------------

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

const skillVariants: Record<SkillLevel, 'advanced' | 'beginner'> = {
  advanced: 'advanced',
  beginner: 'beginner',
};

// ---- Props ---------------------------------------------------------------

interface CompactDrillCardProps {
  drill: Drill;
  stationName: string;
  durationMinutes: number;
  players?: Player[];
  coaches?: Profile[];
  /** Tap / click handler — e.g. open full DrillCard in a modal */
  onClick?: () => void;
}

// ---- Component -----------------------------------------------------------

export default function CompactDrillCard({
  drill,
  stationName,
  durationMinutes,
  players = [],
  coaches = [],
  onClick,
}: CompactDrillCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={[
        'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden',
        onClick
          ? 'cursor-pointer hover:shadow-md active:shadow-sm transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2'
          : '',
      ].join(' ')}
    >
      {/* Station name bar */}
      <div className="bg-[#1e3a5f] px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-white font-bold text-sm truncate">{stationName}</span>
        <div className="flex items-center gap-1 text-[#a8c4e0] shrink-0">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-xs font-semibold">{durationMinutes}m</span>
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-2">
        {/* Drill name + category badge */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-[#1e3a5f] text-sm leading-snug line-clamp-2">
            {drill.name}
          </p>
          <Badge variant={categoryVariants[drill.category]} className="shrink-0 mt-0.5">
            {categoryLabels[drill.category]}
          </Badge>
        </div>

        {/* Coaches */}
        {coaches.length > 0 && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
            <span className="text-xs text-gray-600 font-medium truncate">
              {coaches.map((c) => c.full_name).join(', ')}
            </span>
          </div>
        )}

        {/* Players */}
        {players.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {players.map((player) => (
              <div
                key={player.id}
                className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5"
              >
                <span className="text-xs text-gray-800 font-medium">{player.name}</span>
                <Badge variant={skillVariants[player.skill_level]}>
                  {player.skill_level === 'advanced' ? '⭐' : '🟢'}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Tap hint */}
        {onClick && (
          <p className="text-xs text-[#f97316] font-semibold text-right">
            Tap to view full drill →
          </p>
        )}
      </div>
    </div>
  );
}
