"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
}

/**
 * Form input styled for the auth pages. The label uses the mono
 * data-label language of the rest of the app.
 */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon, error, className = "", ...props }, ref) => {
    return (
      <label className="flex flex-col gap-2 w-full">
        <span className="font-code-sm text-on-surface-variant/80 uppercase tracking-[0.2em] text-[11px]">
          {label}
        </span>
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neon-cyan/60 pointer-events-none text-lg leading-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full bg-white/[0.04] border rounded-lg px-4 py-3 text-sm text-white placeholder-on-surface-variant/40 outline-none transition-colors duration-200 ${
              icon ? "pl-11" : ""
            } ${
              error
                ? "border-[#ff4d67]/60 focus:border-[#ff4d67]"
                : "border-white/10 focus:border-neon-cyan"
            } focus:ring-1 focus:ring-neon-cyan/40 ${className}`}
            {...props}
          />
        </div>
        {error && (
          <span className="font-code-sm text-[#ff4d67] text-[11px]">{error}</span>
        )}
      </label>
    );
  }
);

AuthInput.displayName = "AuthInput";
