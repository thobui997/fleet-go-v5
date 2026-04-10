import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@shared/ui/toaster';
import { AuthProviderWrapper } from './auth-provider';
import { queryClient } from '../lib/query-client';
import { router } from '../lib/router';

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProviderWrapper>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProviderWrapper>
    </QueryClientProvider>
  );
}
