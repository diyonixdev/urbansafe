import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-obsidian-900 rounded-lg active:scale-95';
  
  const variants = {
    primary: 'bg-neon-cyan text-obsidian-900 hover:glow-cyan focus:ring-neon-cyan',
    secondary: 'glass-panel text-white hover:bg-white/10 focus:ring-white/50 border border-white/10',
    ghost: 'text-gray-400 hover:text-white hover:bg-white/5 focus:ring-white/20',
    danger: 'bg-neon-red/10 text-neon-red border border-neon-red/20 hover:bg-neon-red hover:text-white focus:ring-neon-red',
  };
  
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };
  
  const classes = [
    baseStyles,
    variants[variant],
    sizes[size],
    fullWidth ? 'w-full' : '',
    className,
  ].join(' ').trim();

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
