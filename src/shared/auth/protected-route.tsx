import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './use-auth';
import { Skeleton } from '@shared/ui/skeleton';

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard component that redirects unauthenticated users to /login.
 * Stores the intended location in state for post-login redirect.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state during initial auth check
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
