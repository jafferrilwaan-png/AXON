import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging tailwind classes
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Premium Glass Component
 */
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard = ({ children, className, hover = true }: GlassCardProps) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.01 } : {}}
      className={cn(
        "glass-morphism p-6 transition-all duration-300 hover:bg-white/8 hover:border-white/20",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

/**
 * Branded Button
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  ...props
}: ButtonProps) => {
  const variants = {
    primary: "bg-gradient-brand text-white hover:opacity-90 shadow-xl shadow-brand-blue/20",
    secondary: "bg-white text-slate-900 hover:bg-slate-100 shadow-xl shadow-white/10",
    outline: "border border-white/20 text-white hover:bg-white/5",
    ghost: "text-white/70 hover:bg-white/5 hover:text-white"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs font-medium rounded-lg",
    md: "px-5 py-2.5 text-sm font-medium rounded-xl",
    lg: "px-8 py-4 text-base font-semibold rounded-2xl"
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
      ) : null}
      {children}
    </button>
  );
};

/**
 * Standard Form Input
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className, ...props }: InputProps) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-sm font-medium text-slate-400 ml-1">{label}</label>}
      <input
        className={cn(
          "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue/50 transition-all",
          error && "border-red-500 focus:ring-red-500/50",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
    </div>
  );
};

/**
 * Badge Component
 */
export const Badge = ({ children, variant = 'info', className }: { children: React.ReactNode, variant?: 'info' | 'success' | 'warning' | 'error' | 'outline', className?: string }) => {
  const styles = {
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    outline: "bg-transparent text-slate-400 border-white/10"
  };

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", styles[variant], className)}>
      {children}
    </span>
  );
};
