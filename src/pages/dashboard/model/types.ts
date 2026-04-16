/**
 * Dashboard-specific types for stats and quick views.
 * These types pick specific fields from entity types for dashboard display.
 */

/**
 * Dashboard KPI stats aggregated from multiple sources.
 * Each field represents a metric displayed on a stat card.
 */
export interface DashboardStats {
  /** Total vehicle count in fleet */
  vehicleTotal: number;
  /** Active vehicles (status='active') */
  vehicleActive: number;
  /** Total trips scheduled for today */
  tripsToday: number;
  /** Trips with status='scheduled' today */
  tripsScheduled: number;
  /** Trips with status='in_progress' today */
  tripsInProgress: number;
  /** Total bookings created today */
  bookingsToday: number;
  /** Sum of completed payments today (in VND) */
  revenueToday: number;
}

/**
 * Recent booking for dashboard quick view table.
 * Picks relevant fields from BookingWithDetails.
 */
export interface RecentBooking {
  id: string;
  booking_code: string;
  customer: {
    full_name: string;
  } | null;
  trip: {
    departure_time: string;
    route: {
      origin_station: { id: string; name: string } | null;
      destination_station: { id: string; name: string } | null;
    } | null;
  } | null;
  total_amount: number;
  status: string;
}

/**
 * Upcoming trip for dashboard quick view list.
 * Picks relevant fields from TripWithDetails.
 */
export interface UpcomingTrip {
  id: string;
  departure_time: string;
  route: {
    name: string;
    origin_station: { id: string; name: string } | null;
    destination_station: { id: string; name: string } | null;
  } | null;
  vehicle: {
    license_plate: string;
  } | null;
  status: string;
}

/**
 * Revenue data point for trend chart.
 * Represents total revenue for a single day.
 */
export interface RevenueDataPoint {
  /** Display date in DD/MM format for X-axis */
  date: string;
  /** Revenue amount in VND */
  amount: number;
  /** Full date in YYYY-MM-DD format for tooltip */
  fullDate: string;
}

/**
 * Status count for breakdown charts.
 * Represents count of items in a specific status.
 */
export interface StatusCount {
  /** Status key (e.g., 'scheduled', 'completed') */
  status: string;
  /** Number of items in this status */
  count: number;
}
