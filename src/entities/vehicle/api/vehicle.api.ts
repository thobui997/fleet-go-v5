import { supabase } from '@shared/api';
import type {
  Vehicle,
  VehicleInsert,
  VehicleListParams,
  VehicleUpdate,
  VehicleWithType,
} from '../model/types';

export async function fetchVehicles(
  params: VehicleListParams
): Promise<{ data: VehicleWithType[]; count: number }> {
  const { page, pageSize, search, status } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('vehicles')
    .select('*, vehicle_type:vehicle_types ( id, name )', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('license_plate', `%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: (data ?? []) as VehicleWithType[], count: count ?? 0 };
}

export async function fetchVehicle(id: string): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as Vehicle;
}

export async function createVehicle(input: VehicleInsert): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(input)
    .select()
    .single();

  if (error) throw error;

  return data as Vehicle;
}

export async function updateVehicle(
  id: string,
  input: VehicleUpdate
): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as Vehicle;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);

  if (error) throw error;
}
