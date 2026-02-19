'use client';

import React from 'react';
import type { Player } from '@/lib/types';
import Badge from '@/components/ui/Badge';

interface PlayerChecklistProps {
  players: Player[];
  selectedIds: Set<string>;
  onChange: (updated: Set<string>) => void;
}

export default function PlayerChecklist({
  players,
  selectedIds,
  onChange,
}: PlayerChecklistProps) {
  const advancedCount = players.filter(
    (p) => selectedIds.has(p.id) && p.skill_level === 'advanced'
  ).length;
  const beginnerCount = players.filter(
    (p) => selectedIds.has(p.id) && p.skill_level === 'beginner'
  ).length;
  const totalSelected = selectedIds.size;

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  function toggleAll() {
    if (selectedIds.size === players.length) {
      onChange(new Set());
    } else {
      onChange(new Set(players.map((p) => p.id)));
    }
  }

  const allSelected = selectedIds.size === players.length && players.length > 0;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Summary header */}
      <div className="bg-[#1e3a5f] px-4 py-3">
        <p className="text-white font-semibold text-sm">
          {totalSelected} player{totalSelected !== 1 ? 's' : ''}
          {totalSelected > 0 && (
            <span className="text-[#a8c4e0] font-normal">
              {' '}({advancedCount > 0 ? `${advancedCount} advanced` : ''}
              {advancedCount > 0 && beginnerCount > 0 ? ', ' : ''}
              {beginnerCount > 0 ? `${beginnerCount} beginner` : ''})
            </span>
          )}
        </p>
      </div>

      {/* Select-all row */}
      <label className="flex items-center gap-3 px-4 border-b border-gray-100 min-h-[48px] cursor-pointer hover:bg-gray-50">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={toggleAll}
          className="w-5 h-5 rounded border-gray-300 text-[#1e3a5f] accent-[#1e3a5f] cursor-pointer"
          aria-label="Select all players"
        />
        <span className="text-sm font-semibold text-gray-700">
          {allSelected ? 'Deselect all' : 'Select all'}
        </span>
      </label>

      {/* Player rows */}
      <ul>
        {players.map((player) => {
          const checked = selectedIds.has(player.id);
          return (
            <li key={player.id}>
              <label className="flex items-center gap-3 px-4 border-b border-gray-50 last:border-0 min-h-[48px] cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(player.id)}
                  className="w-5 h-5 rounded border-gray-300 text-[#1e3a5f] accent-[#1e3a5f] cursor-pointer shrink-0"
                  aria-label={`${player.name}, ${player.skill_level}`}
                />
                <span className="flex-1 text-sm font-medium text-gray-900">
                  {player.name}
                </span>
                <Badge
                  variant={
                    player.skill_level === 'advanced' ? 'advanced' : 'beginner'
                  }
                >
                  {player.skill_level === 'advanced' ? '⭐ Advanced' : '🟢 Beginner'}
                </Badge>
              </label>
            </li>
          );
        })}
      </ul>

      {players.length === 0 && (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">
          No players added yet.
        </p>
      )}
    </div>
  );
}
