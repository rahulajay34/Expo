import { cn } from '@/lib/utils';

type BadgeVariant = 'lecture' | 'pre-lecture' | 'assignment' | 'provider' | 'default';

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
          lecture: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          'pre-lecture': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          assignment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          provider: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
          default: 'bg-sidebar text-text-secondary',
        }[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
