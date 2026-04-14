import type { Vehicle } from '@entities/vehicle';

export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'emergency';

export const MAINTENANCE_TYPES = [
  'routine',
  'repair',
  'inspection',
  'emergency',
] as const satisfies readonly MaintenanceType[];

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  type: MaintenanceType;
  description: string;
  cost: number;
  performed_by: string | null;
  performed_at: string;
  next_due_date: string | null;
  odometer_reading: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MaintenanceLogWithVehicle = MaintenanceLog & {
  vehicle: Pick<Vehicle, 'id' | 'license_plate'> | null;
};

export type MaintenanceLogInsert = Omit<
  MaintenanceLog,
  'id' | 'created_at' | 'updated_at'
>;

export type MaintenanceLogUpdate = Partial<MaintenanceLogInsert>;

export interface MaintenanceLogListParams {
  page: number;
  pageSize: number;
  vehicleId?: string;
  type?: MaintenanceType;
}
