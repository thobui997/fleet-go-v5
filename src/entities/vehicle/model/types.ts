import type { VehicleType } from '@entities/vehicle-type';

export type VehicleStatus = 'active' | 'maintenance' | 'retired';

export const VEHICLE_STATUSES = ['active', 'maintenance', 'retired'] as const satisfies readonly VehicleStatus[];

export interface Vehicle {
  id: string;
  vehicle_type_id: string;
  license_plate: string;
  vin_number: string | null;
  year_manufactured: number | null;
  status: VehicleStatus;
  current_mileage: number | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type VehicleWithType = Vehicle & {
  vehicle_type: Pick<VehicleType, 'id' | 'name'> | null;
};

export type VehicleInsert = Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>;

export type VehicleUpdate = Partial<VehicleInsert>;

export interface VehicleListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: VehicleStatus;
}
