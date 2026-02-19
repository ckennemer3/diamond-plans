'use client';

// ============================================
// StationAssignment — single station card for live view
// ============================================

import React from 'react';
import { Clock, User, Users } from 'lucide-react';
import type { Drill, Player, Profile, SkillLevel } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { formatTime } from '@/lib/timer';

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

interface StationAssignmentProps {
  stationName: string;
  drill: Drill | null;
  coaches: Profile[];
  players: Player[];
  durationMinutes: number;
  /** Remaining ms for time-remaining display. Optional. */
  remainingMs?: number;
}

// ---- Component -----------------------------------------------------------

export default function StationAssignment({
  stationName,
  drill,
  coaches,
  players,
  durationMinutes,
  remainingMs,
}: StationAssignmentProps) {
  const showRemaining = typeof remainingMs === 'number';
  const remainingFormatted = showRemaining ? formatTime(remainingMs!) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-[#1e3a5f] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-white font-bold text-base leading-snug">{stationName}</h3>
          {drill && (
            <Badge variant={categoryVariants[drill.category]} className="shrink-0 mt-0.5">
              {categoryLabels[drill.category]}
            </Badge>
          )}
        </div>

        {/* Duration + time remaining */}
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1 text-[#a8c4e0]">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="text-xs font-semibold">{durationMinutes} min</span>
          </div>
          {showRemaining && (
            <div
              className={[
                'flex items-center gap-1 font-semibold text-xs',
                remainingMs! <= 30_000
                  ? 'text-[#f59e0b]'
                  : remainingMs! <= 0
                    ? 'text-green-400'
                    : 'text-[#a8c4e0]',
              ].join(' ')}
            >
              <span>{remainingMs! <= 0 ? 'Done' : `${remainingFormatted} left`}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Drill name */}
        {drill ? (
          <p className="font-bold text-[#1e3a5f] text-sm">{drill.name}</p>
        ) : (
          <p className="text-gray-400 text-sm italic">No drill assigned</p>
        )}

        {/* Coaches */}
        {coaches.length > 0 && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
            <div className="flex flex-wrap gap-1.5">
              {coaches.map((coach) => (
                <span
                  key={coach.id}
                  className="bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold px-2 py-0.5 rounded-full"
                >
                  {coach.full_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Players */}
        {players.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Players ({players.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 min-h-[32px]"
                >
                  <span className="text-sm text-gray-800 font-medium">{player.name}</span>
                  <Badge variant={skillVariants[player.skill_level]}>
                    {player.skill_level === 'advanced' ? '⭐' : '🟢'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
