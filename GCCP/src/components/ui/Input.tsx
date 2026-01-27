import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, fullWidth = false, className, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className={clsx('space-y-1.5', fullWidth && 'w-full')}>
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-[13px] font-medium text-zinc-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'block w-full px-3 py-2 rounded-md border text-sm transition-all duration-150',
              'bg-transparent text-zinc-900',
              'placeholder:text-zinc-400',
              'hover:border-zinc-300',
              'focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400',
              icon && 'pl-10',
              error 
                ? 'border-red-400 focus:ring-red-400 focus:border-red-400' 
                : 'border-zinc-200 shadow-sm',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[13px] text-red-600 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
