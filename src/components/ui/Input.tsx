import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-text-primary',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
        'placeholder:text-text-secondary',
        'disabled:opacity-50 disabled:bg-sidebar',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
export { Input };
