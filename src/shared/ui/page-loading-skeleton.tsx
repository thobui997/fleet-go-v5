import { Skeleton } from '@shared/ui/skeleton';
import { cn } from '@shared/lib/cn';

interface PageLoadingSkeletonProps {
  className?: string;
}

export function PageLoadingSkeleton({ className }: PageLoadingSkeletonProps) {
  return (
    <div className={cn('space-y-6 p-6', className)}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
