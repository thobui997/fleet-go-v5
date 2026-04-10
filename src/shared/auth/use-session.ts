import type { Session } from '@supabase/supabase-js';
import { useAuth } from './use-auth';

/**
 * Convenience hook that returns just the session object.
 * Useful for components that only need session data (JWT tokens, etc.).
 */
export function useSession(): Session | null {
  const { session } = useAuth();
  return session;
}
