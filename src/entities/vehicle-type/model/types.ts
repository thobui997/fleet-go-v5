export interface VehicleType {
  id: string;
  name: string;
  description: string | null;
  seat_layout: Record<string, unknown>;
  total_floors: number;
  total_seats: number;
  amenities: string[];
  created_at: string;
  updated_at: string;
}

export type VehicleTypeInsert = Omit<VehicleType, 'id' | 'created_at' | 'updated_at'>;

export type VehicleTypeUpdate = Partial<VehicleTypeInsert>;

export interface VehicleTypeListParams {
  page: number;
  pageSize: number;
  search?: string;
}
