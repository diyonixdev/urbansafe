import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  pulse?: boolean;
}

export function Badge({
  className = '',
  variant = 'neutral',
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    info: 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20',
    success: 'bg-neon-green/10 text-neon-green border border-neon-green/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
    danger: 'bg-neon-red/10 text-neon-red border border-neon-red/20',
    neutral: 'bg-white/5 text-gray-300 border border-white/10',
  };

  const pulseEffects = {
    info: 'bg-neon-blue',
    success: 'bg-neon-green',
    warning: 'bg-yellow-500',
    danger: 'bg-neon-red',
    neutral: 'bg-white',
  };

  const classes = [
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
    variants[variant],
    className,
  ].join(' ').trim();

  return (
    <span className={classes} {...props}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseEffects[variant]}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseEffects[variant]}`}></span>
        </span>
      )}
      {children}
    </span>
  );
}
