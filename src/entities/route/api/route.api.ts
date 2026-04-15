import { supabase } from '@shared/api';
import type {
  Route,
  RouteInsert,
  RouteListParams,
  RouteUpdate,
} from '../model/types';

const ROUTE_SELECT =
  '*, origin_station:stations!routes_origin_station_fk(id,name), destination_station:stations!routes_destination_station_fk(id,name)';

export async function fetchRoutes(
  params: RouteListParams
): Promise<{ data: Route[]; count: number }> {
  const { page, pageSize, search, isActive } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('routes')
    .select(ROUTE_SELECT, { count: 'exact' })
    .range(from, to)
    .order('name', { ascending: true });

  const q = (search ?? '').trim();
  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: (data ?? []) as Route[], count: count ?? 0 };
}

export async function fetchRoute(id: string): Promise<Route> {
  const { data, error } = await supabase
    .from('routes')
    .select(ROUTE_SELECT)
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as Route;
}

export async function createRoute(input: RouteInsert): Promise<Route> {
  const { data, error } = await supabase
    .from('routes')
    .insert(input)
    .select()
    .single();

  if (error) throw error;

  return data as Route;
}

export async function updateRoute(
  id: string,
  input: RouteUpdate
): Promise<Route> {
  const { data, error } = await supabase
    .from('routes')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as Route;
}

export async function deleteRoute(id: string): Promise<void> {
  const { error } = await supabase.from('routes').delete().eq('id', id);

  if (error) throw error;
}
