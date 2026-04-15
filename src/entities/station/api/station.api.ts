import { supabase } from '@shared/api';
import type {
  Station,
  StationInsert,
  StationListParams,
  StationUpdate,
} from '../model/types';

export async function fetchStations(
  params: StationListParams
): Promise<{ data: Station[]; count: number }> {
  const { page, pageSize, search, isActive } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('stations')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('name', { ascending: true });

  const q = (search ?? '').trim();
  if (q) {
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%`);
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: (data ?? []) as Station[], count: count ?? 0 };
}

export async function fetchStation(id: string): Promise<Station> {
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as Station;
}

export async function createStation(input: StationInsert): Promise<Station> {
  const { data, error } = await supabase
    .from('stations')
    .insert(input)
    .select()
    .single();

  if (error) throw error;

  return data as Station;
}

export async function updateStation(
  id: string,
  input: StationUpdate
): Promise<Station> {
  const { data, error } = await supabase
    .from('stations')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as Station;
}

export async function deleteStation(id: string): Promise<void> {
  const { error } = await supabase.from('stations').delete().eq('id', id);

  if (error) throw error;
}
