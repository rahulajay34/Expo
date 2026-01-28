'use client';

import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

/**
 * Pulsing skeleton loader for content placeholders
 */
export function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'skeleton h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton for larger content blocks
 */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={clsx('rounded-2xl border border-gray-200 p-6 bg-white', className)}>
      <div className="skeleton h-6 w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-4/6" />
      </div>
    </div>
  );
}

/**
 * Editor skeleton while Monaco loads
 */
export function EditorSkeleton() {
  return (
    <div className="h-full p-6 space-y-4 bg-white">
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-5/6" />
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-10 w-full mt-4 rounded-lg" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-4/5" />
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-3/4" />
    </div>
  );
}

/**
 * Preview skeleton for markdown preview panel
 */
export function PreviewSkeleton() {
  return (
    <div className="p-8 space-y-6 bg-gray-50/30">
      {/* Title */}
      <div className="skeleton h-8 w-1/2" />
      
      {/* Intro paragraph */}
      <div className="space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-4/6" />
      </div>
      
      {/* Section heading */}
      <div className="skeleton h-6 w-1/3 mt-6" />
      
      {/* Content */}
      <div className="space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/4" />
      </div>
      
      {/* Code block */}
      <div className="skeleton h-24 rounded-lg" />
      
      {/* More content */}
      <div className="space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Table row skeleton for AssignmentWorkspace
 */
export function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="p-4"><div className="skeleton h-4 w-8" /></td>
      <td className="p-4"><div className="skeleton h-4 w-16" /></td>
      <td className="p-4"><div className="skeleton h-4 w-full" /></td>
      <td className="p-4"><div className="skeleton h-4 w-24" /></td>
      <td className="p-4"><div className="skeleton h-4 w-16" /></td>
    </tr>
  );
}

