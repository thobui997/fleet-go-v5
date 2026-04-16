export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export const TRIP_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const satisfies readonly TripStatus[];

export interface Trip {
  id: string;
  route_id: string;
  vehicle_id: string;
  departure_time: string;
  estimated_arrival_time: string;
  actual_arrival_time: string | null;
  status: TripStatus;
  price_override: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TripWithDetails = Trip & {
  route: {
    id: string;
    name: string;
    origin_station: { id: string; name: string } | null;
    destination_station: { id: string; name: string } | null;
  } | null;
  vehicle: { id: string; license_plate: string } | null;
};

export type TripInsert = Omit<
  Trip,
  'id' | 'created_at' | 'updated_at'
> & {
  actual_arrival_time: string | null;
  price_override: number | null;
  notes: string | null;
};

export type TripUpdate = Partial<TripInsert>;

export interface TripListParams {
  page: number;
  pageSize: number;
  status?: TripStatus;
  routeId?: string;
  dateFrom?: string;
  dateTo?: string;
}
