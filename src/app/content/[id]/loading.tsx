import { Skeleton } from '@/components/ui/Skeleton';

export default function ContentDetailLoading() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <div className="space-y-4 w-64">
        <Skeleton className="h-6 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </div>
      <div className="space-y-3 w-80">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <p className="text-sm text-text-secondary">Loading...</p>
    </div>
  );
}
