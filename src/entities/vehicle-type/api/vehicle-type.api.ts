import { supabase } from '@shared/api';
import type {
  VehicleType,
  VehicleTypeInsert,
  VehicleTypeListParams,
  VehicleTypeUpdate,
} from '../model/types';

export async function fetchVehicleTypes(
  params: VehicleTypeListParams
): Promise<{ data: VehicleType[]; count: number }> {
  const { page, pageSize, search } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('vehicle_types')
    .select('*', { count: 'exact' })
    .range(from, to);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: (data ?? []) as VehicleType[], count: count ?? 0 };
}

export async function fetchVehicleType(id: string): Promise<VehicleType> {
  const { data, error } = await supabase
    .from('vehicle_types')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as VehicleType;
}

export async function createVehicleType(
  input: VehicleTypeInsert
): Promise<VehicleType> {
  const { data, error } = await supabase
    .from('vehicle_types')
    .insert(input)
    .select()
    .single();

  if (error) throw error;

  return data as VehicleType;
}

export async function updateVehicleType(
  id: string,
  input: VehicleTypeUpdate
): Promise<VehicleType> {
  const { data, error } = await supabase
    .from('vehicle_types')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as VehicleType;
}

export async function deleteVehicleType(id: string): Promise<void> {
  const { error } = await supabase
    .from('vehicle_types')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
