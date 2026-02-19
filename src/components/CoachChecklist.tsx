'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Profile } from '@/lib/types';
import Badge from '@/components/ui/Badge';

interface CoachChecklistProps {
  coaches: Profile[];
  selectedIds: Set<string>;
  onChange: (updated: Set<string>) => void;
}

const roleLabels: Record<Profile['role'], string> = {
  head_coach: 'Head Coach',
  assistant_coach: 'Assistant',
};

const roleVariants: Record<
  Profile['role'],
  'advanced' | 'beginner' | 'default' | 'success' | 'warning'
> = {
  head_coach: 'advanced',
  assistant_coach: 'default',
};

export default function CoachChecklist({
  coaches,
  selectedIds,
  onChange,
}: CoachChecklistProps) {
  const selectedCount = selectedIds.size;
  const showWarning = selectedCount > 0 && selectedCount < 2;

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
    if (selectedIds.size === coaches.length) {
      onChange(new Set());
    } else {
      onChange(new Set(coaches.map((c) => c.id)));
    }
  }

  const allSelected = selectedIds.size === coaches.length && coaches.length > 0;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Summary header */}
      <div className="bg-[#1e3a5f] px-4 py-3">
        <p className="text-white font-semibold text-sm">
          {selectedCount} coach{selectedCount !== 1 ? 'es' : ''} today
          {selectedCount > 0 && (
            <span className="text-[#a8c4e0] font-normal">
              {' '}→ {selectedCount} station{selectedCount !== 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {/* Warning banner */}
      {showWarning && (
        <div className="flex items-start gap-2 bg-yellow-50 border-b border-yellow-100 px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-yellow-800">
            With {selectedCount} coach, we&apos;ll run whole-team format
          </p>
        </div>
      )}

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
          aria-label="Select all coaches"
        />
        <span className="text-sm font-semibold text-gray-700">
          {allSelected ? 'Deselect all' : 'Select all'}
        </span>
      </label>

      {/* Coach rows */}
      <ul>
        {coaches.map((coach) => {
          const checked = selectedIds.has(coach.id);
          return (
            <li key={coach.id}>
              <label className="flex items-center gap-3 px-4 border-b border-gray-50 last:border-0 min-h-[48px] cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(coach.id)}
                  className="w-5 h-5 rounded border-gray-300 text-[#1e3a5f] accent-[#1e3a5f] cursor-pointer shrink-0"
                  aria-label={`${coach.full_name}, ${roleLabels[coach.role]}`}
                />
                <span className="flex-1 text-sm font-medium text-gray-900">
                  {coach.full_name}
                </span>
                <Badge variant={roleVariants[coach.role]}>
                  {roleLabels[coach.role]}
                </Badge>
              </label>
            </li>
          );
        })}
      </ul>

      {coaches.length === 0 && (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">
          No coaches added yet.
        </p>
      )}
    </div>
  );
}
