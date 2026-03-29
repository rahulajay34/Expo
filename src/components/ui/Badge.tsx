import { cn } from '@/lib/utils';

type BadgeVariant = 'lecture' | 'pre-lecture' | 'assignment' | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap',
        {
          lecture: 'bg-blue-100 text-blue-700',
          'pre-lecture': 'bg-green-100 text-green-700',
          assignment: 'bg-purple-100 text-purple-700',
          default: 'bg-sidebar text-text-secondary',
        }[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
