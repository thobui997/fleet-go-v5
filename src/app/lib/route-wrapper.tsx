import { Suspense, type ReactNode } from 'react';
import { PageLoadingSkeleton } from '@shared/ui/page-loading-skeleton';
import { ErrorBoundary } from '@shared/ui/error-boundary';

interface RouteWrapperProps {
  children: ReactNode;
}

export function RouteWrapper({ children }: RouteWrapperProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoadingSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
