export interface Route {
  id: string;
  name: string;
  origin_station_id: string;
  destination_station_id: string;
  distance_km: number;
  estimated_duration: string; // PostgreSQL interval as "HH:MM:SS"
  base_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined from PostgREST FK join (present only in list/detail queries)
  origin_station?: { id: string; name: string };
  destination_station?: { id: string; name: string };
}

export interface RouteInsert {
  name: string;
  origin_station_id: string;
  destination_station_id: string;
  distance_km: number;
  estimated_duration: string; // PostgreSQL interval string, e.g. "150 minutes"
  base_price: number;
  is_active?: boolean;
}

export interface RouteUpdate {
  name?: string;
  origin_station_id?: string;
  destination_station_id?: string;
  distance_km?: number;
  estimated_duration?: string;
  base_price?: number;
  is_active?: boolean;
}

export interface RouteListParams {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}
