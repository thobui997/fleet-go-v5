export interface RouteStop {
  route_id: string;
  station_id: string;
  stop_order: number;
  estimated_arrival: string | null; // PostgreSQL interval "HH:MM:SS" or null
  pickup_allowed: boolean;
  dropoff_allowed: boolean;
  // Joined from PostgREST FK
  station?: { id: string; name: string };
}

export interface RouteStopInsert {
  route_id: string;
  station_id: string;
  stop_order: number;
  estimated_arrival?: string | null; // e.g. "01:30:00"
}
