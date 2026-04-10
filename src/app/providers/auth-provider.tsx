import type { ReactNode } from 'react';
import { AuthProvider } from '@shared/auth';

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Thin wrapper that imports AuthProvider from shared/auth.
 * This is an app-layer file that composes shared auth into the app tree.
 */
export function AuthProviderWrapper({ children }: AuthProviderProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
