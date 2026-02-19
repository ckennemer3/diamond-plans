'use client';

import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:bg-[#0f2038] border border-transparent',
  secondary:
    'bg-white text-[#1e3a5f] border border-gray-300 hover:bg-gray-50 active:bg-gray-100',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-transparent',
  ghost:
    'bg-transparent text-[#1e3a5f] border border-transparent hover:bg-[#1e3a5f]/10 active:bg-[#1e3a5f]/20',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-2 text-sm min-h-[48px]',
  md: 'px-4 py-3 text-base min-h-[48px]',
  lg: 'px-6 py-4 text-lg min-h-[48px]',
};

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
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
  );
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2 cursor-pointer select-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
