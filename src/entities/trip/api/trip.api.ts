import { supabase } from '@shared/api';
import type {
  TripInsert,
  TripListParams,
  TripUpdate,
  TripWithDetails,
} from '../model/types';

const TRIP_SELECT =
  '*, route:routes(id, name, origin_station:stations!routes_origin_station_fk(id, name), destination_station:stations!routes_destination_station_fk(id, name)), vehicle:vehicles(id, license_plate)';

export async function fetchTrips(
  params: TripListParams
): Promise<{ data: TripWithDetails[]; count: number }> {
  const { page, pageSize, status, routeId, dateFrom, dateTo } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('trips')
    .select(TRIP_SELECT, { count: 'exact' })
    .range(from, to)
    .order('departure_time', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (routeId) {
    query = query.eq('route_id', routeId);
  }

  if (dateFrom) {
    query = query.gte('departure_time', `${dateFrom}T00:00:00`);
  }

  if (dateTo) {
    query = query.lte('departure_time', `${dateTo}T23:59:59`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: (data ?? []) as TripWithDetails[], count: count ?? 0 };
}

export async function fetchTrip(id: string): Promise<TripWithDetails> {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_SELECT)
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as TripWithDetails;
}

export async function createTrip(input: TripInsert): Promise<TripWithDetails> {
  const { data, error } = await supabase
    .from('trips')
    .insert(input)
    .select(TRIP_SELECT)
    .single();

  if (error) throw error;

  return data as TripWithDetails;
}

export async function updateTrip(
  id: string,
  input: TripUpdate
): Promise<TripWithDetails> {
  const { data, error } = await supabase
    .from('trips')
    .update(input)
    .eq('id', id)
    .select(TRIP_SELECT)
    .single();

  if (error) throw error;

  return data as TripWithDetails;
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id);

  if (error) throw error;
}
