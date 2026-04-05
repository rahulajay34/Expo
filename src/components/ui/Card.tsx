import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('bg-background rounded-md border border-border surface-1 dark-border-interactive', className)} {...props} />
  )
);
Card.displayName = 'Card';
export { Card };
