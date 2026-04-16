import { useQuery } from '@tanstack/react-query';
import { supabase } from '@shared/api/supabase-client';
import { useAuth } from './use-auth';

export interface ProfileData {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery<ProfileData | null>({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  });
}
