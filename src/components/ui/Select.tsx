import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-text-primary',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
        'disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Select.displayName = 'Select';
export { Select };
