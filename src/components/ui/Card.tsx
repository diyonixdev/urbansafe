import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'bordered';
  glowOnHover?: boolean;
}

export function Card({
  className = '',
  variant = 'glass',
  glowOnHover = false,
  children,
  ...props
}: CardProps) {
  const variants = {
    glass: 'glass-panel',
    solid: 'bg-obsidian-800',
    bordered: 'bg-transparent border border-white/10',
  };

  const hoverEffect = glowOnHover
    ? 'transition-all duration-300 hover:glow-cyan hover:border-neon-cyan/50'
    : '';

  const classes = [
    'rounded-xl p-6 relative overflow-hidden',
    variants[variant],
    hoverEffect,
    className,
  ].join(' ').trim();

  return (
    <div className={classes} {...props}>
      {/* Optional subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
