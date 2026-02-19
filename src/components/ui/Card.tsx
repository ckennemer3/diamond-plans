import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={[
        'bg-white rounded-xl shadow-sm p-4',
        isClickable
          ? 'cursor-pointer hover:shadow-md active:shadow-sm transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
