import * as React from 'react';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

/**
 * Custom hook that consumes AuthContext.
 * Throws error if used outside AuthProvider.
 * Returns the full AuthContextValue.
 */
export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
