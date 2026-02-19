import React from 'react';

interface BadgeProps {
  variant?: 'advanced' | 'beginner' | 'default' | 'success' | 'warning';
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  advanced: 'bg-[#f97316] text-white',
  beginner: 'bg-green-500 text-white',
  default: 'bg-gray-200 text-gray-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-yellow-100 text-yellow-800',
};

export default function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
