import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-md transition-colors cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            primary: 'bg-accent text-white hover:bg-accent/90 active:bg-accent/80',
            secondary: 'bg-background text-text-primary border border-border hover:bg-sidebar',
            ghost: 'text-text-secondary hover:bg-sidebar hover:text-text-primary',
            danger: 'bg-danger text-white hover:bg-danger/90',
          }[variant],
          {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-sm',
          }[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
export { Button };
