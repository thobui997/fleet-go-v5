import { supabase } from '@shared/api';
import type {
  MaintenanceLog,
  MaintenanceLogInsert,
  MaintenanceLogListParams,
  MaintenanceLogUpdate,
  MaintenanceLogWithVehicle,
} from '../model/types';

export async function fetchMaintenanceLogs(
  params: MaintenanceLogListParams
): Promise<{ data: MaintenanceLogWithVehicle[]; count: number }> {
  const { page, pageSize, vehicleId, type } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('maintenance_logs')
    .select('*, vehicle:vehicles ( id, license_plate )', { count: 'exact' })
    .range(from, to)
    .order('performed_at', { ascending: false });

  if (vehicleId) {
    query = query.eq('vehicle_id', vehicleId);
  }

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: (data ?? []) as MaintenanceLogWithVehicle[], count: count ?? 0 };
}

export async function fetchMaintenanceLog(id: string): Promise<MaintenanceLog> {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as MaintenanceLog;
}

export async function createMaintenanceLog(
  input: MaintenanceLogInsert
): Promise<MaintenanceLog> {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .insert(input)
    .select()
    .single();

  if (error) throw error;

  return data as MaintenanceLog;
}

export async function updateMaintenanceLog(
  id: string,
  input: MaintenanceLogUpdate
): Promise<MaintenanceLog> {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as MaintenanceLog;
}

export async function deleteMaintenanceLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('maintenance_logs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
