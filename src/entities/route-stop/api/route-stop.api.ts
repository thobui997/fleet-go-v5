import { supabase } from '@shared/api';
import type { RouteStop, RouteStopInsert } from '../model/types';

export async function fetchRouteStops(routeId: string): Promise<RouteStop[]> {
  const { data, error } = await supabase
    .from('route_stops')
    .select('*, station:stations(id,name)')
    .eq('route_id', routeId)
    .order('stop_order', { ascending: true });

  if (error) throw error;

  return (data ?? []) as RouteStop[];
}

export async function saveRouteStops(
  routeId: string,
  stops: RouteStopInsert[]
): Promise<void> {
  // Step 1: DELETE all existing stops for this route
  const { error: deleteError } = await supabase
    .from('route_stops')
    .delete()
    .eq('route_id', routeId);

  if (deleteError) throw deleteError;

  // Step 2: If no stops to insert, return early
  if (stops.length === 0) return;

  // Step 3: INSERT the new stops
  const { error: insertError } = await supabase
    .from('route_stops')
    .insert(stops);

  if (insertError) throw insertError;
}
