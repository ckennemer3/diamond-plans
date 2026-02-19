'use client';

import React from 'react';
import type { GeneratedSegment, Player, Profile, SegmentType } from '@/lib/types';
import Badge from '@/components/ui/Badge';

interface PracticePlanOverviewProps {
  segments: GeneratedSegment[];
  players: Player[];
  coaches: Profile[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(offsetMinutes: number, practiceStart = 9 * 60): string {
  const totalMinutes = practiceStart + offsetMinutes;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatTimeRange(
  startOffset: number,
  durationMinutes: number,
  practiceStart = 9 * 60
): string {
  return `${formatTime(startOffset, practiceStart)} – ${formatTime(
    startOffset + durationMinutes,
    practiceStart
  )}`;
}

interface SegmentStyle {
  border: string;
  badge: string;
  label: string;
}

const SEGMENT_STYLES: Record<SegmentType, SegmentStyle> = {
  warmup: {
    border: 'border-l-4 border-l-blue-400',
    badge: 'bg-blue-100 text-blue-800',
    label: 'Warmup',
  },
  station: {
    border: 'border-l-4 border-l-[#f97316]',
    badge: 'bg-orange-100 text-orange-800',
    label: 'Station',
  },
  water_break: {
    border: 'border-l-4 border-l-cyan-400',
    badge: 'bg-cyan-50 text-cyan-700',
    label: 'Water Break',
  },
  team_activity: {
    border: 'border-l-4 border-l-purple-400',
    badge: 'bg-purple-100 text-purple-800',
    label: 'Team Game',
  },
  cooldown: {
    border: 'border-l-4 border-l-green-400',
    badge: 'bg-green-100 text-green-800',
    label: 'Cooldown',
  },
  transition: {
    border: 'border-l-4 border-l-gray-300',
    badge: 'bg-gray-100 text-gray-600',
    label: 'Transition',
  },
};

function SegmentTypeBadge({ type }: { type: SegmentType }) {
  const style = SEGMENT_STYLES[type] ?? SEGMENT_STYLES.transition;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${style.badge}`}
    >
      {style.label}
    </span>
  );
}

function playerSkillVariant(skill: Player['skill_level']): 'advanced' | 'beginner' {
  return skill === 'advanced' ? 'advanced' : 'beginner';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PracticePlanOverview({
  segments,
  players,
  coaches,
}: PracticePlanOverviewProps) {
  // Build lookup maps
  const playerMap = React.useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players]
  );
  const coachMap = React.useMemo(
    () => new Map(coaches.map((c) => [c.id, c])),
    [coaches]
  );

  const totalDuration = segments.reduce((acc, s) => acc + s.duration_minutes, 0);

  return (
    <div className="space-y-3">
      {/* Practice duration summary */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-gray-500">
          {segments.length} segment{segments.length !== 1 ? 's' : ''}
        </p>
        <p className="text-sm font-semibold text-[#1e3a5f]">
          {totalDuration} min total
        </p>
      </div>

      {/* Segments */}
      <div className="space-y-2">
        {segments.map((segment) => {
          const style = SEGMENT_STYLES[segment.segment_type] ?? SEGMENT_STYLES.transition;
          const isWaterBreak = segment.segment_type === 'water_break';
          const isAllTogether =
            segment.segment_type === 'warmup' ||
            segment.segment_type === 'team_activity' ||
            segment.segment_type === 'cooldown';

          const assignedCoaches = segment.coach_ids
            .map((id) => coachMap.get(id))
            .filter(Boolean) as Profile[];

          const assignedPlayers = segment.player_ids
            .map((id) => playerMap.get(id))
            .filter(Boolean) as Player[];

          const advancedPlayers = assignedPlayers.filter(
            (p) => p.skill_level === 'advanced'
          );
          const beginnerPlayers = assignedPlayers.filter(
            (p) => p.skill_level === 'beginner'
          );

          return (
            <div
              key={segment.segment_order}
              className={`bg-white rounded-xl shadow-sm overflow-hidden ${style.border}`}
            >
              {/* Card header */}
              <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <SegmentTypeBadge type={segment.segment_type} />
                    {segment.rotation_number != null && (
                      <span className="text-xs text-gray-400">
                        Rotation {segment.rotation_number}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 leading-snug">
                    {isWaterBreak ? (
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true">💧</span> Water Break
                      </span>
                    ) : (
                      segment.drill?.name ?? segment.station_name
                    )}
                  </h3>
                  {segment.station_name &&
                    !isWaterBreak &&
                    segment.station_name !== segment.drill?.name && (
                      <p className="text-xs text-gray-500 mt-0.5">{segment.station_name}</p>
                    )}
                </div>

                {/* Time info */}
                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium text-[#1e3a5f]">
                    {segment.duration_minutes} min
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatTimeRange(segment.start_offset_minutes, segment.duration_minutes)}
                  </p>
                </div>
              </div>

              {/* Card body — skip for water breaks */}
              {!isWaterBreak && (
                <div className="px-4 pb-3 space-y-2 border-t border-gray-50 pt-2">
                  {/* Coaches */}
                  {assignedCoaches.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 pt-0.5 shrink-0 w-16">Coach</span>
                      <div className="flex flex-wrap gap-1">
                        {assignedCoaches.map((c) => (
                          <span
                            key={c.id}
                            className="text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium"
                          >
                            {c.full_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Players */}
                  {isAllTogether ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 shrink-0 w-16">Players</span>
                      <span className="text-xs text-gray-600 font-medium">
                        All Together ({assignedPlayers.length > 0
                          ? assignedPlayers.length
                          : players.length}{' '}
                        kids)
                      </span>
                    </div>
                  ) : assignedPlayers.length > 0 ? (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 pt-0.5 shrink-0 w-16">Players</span>
                      <div className="flex flex-wrap gap-1">
                        {advancedPlayers.map((p) => (
                          <Badge key={p.id} variant="advanced">
                            {p.name}
                          </Badge>
                        ))}
                        {beginnerPlayers.map((p) => (
                          <Badge key={p.id} variant="beginner">
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Drill category */}
                  {segment.drill?.category && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 shrink-0 w-16">Category</span>
                      <span className="text-xs text-gray-600 capitalize">
                        {segment.drill.category.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
