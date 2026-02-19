'use client';

import React from 'react';

export type FocusCategory =
  | 'hitting'
  | 'fielding'
  | 'throwing'
  | 'baserunning'
  | 'game_situations';

interface FocusOption {
  value: FocusCategory;
  label: string;
  emoji: string;
}

const FOCUS_OPTIONS: FocusOption[] = [
  { value: 'hitting', label: 'Hitting', emoji: '🏏' },
  { value: 'fielding', label: 'Fielding', emoji: '🧤' },
  { value: 'throwing', label: 'Throwing', emoji: '⚾' },
  { value: 'baserunning', label: 'Baserunning', emoji: '🏃' },
  { value: 'game_situations', label: 'Game Situations', emoji: '📋' },
];

interface FocusSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function FocusSelector({ selected, onChange }: FocusSelectorProps) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label="Focus area selection">
      {FOCUS_OPTIONS.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            aria-pressed={isSelected}
            className={[
              'inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold min-h-[48px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 select-none',
              isSelected
                ? 'bg-[#f97316] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-300 hover:border-[#f97316] hover:text-[#f97316]',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span aria-hidden="true">{option.emoji}</span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
