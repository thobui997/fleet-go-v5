import dayjs from 'dayjs';
import { supabase } from '@shared/api';
import type {
  DashboardStats,
  RecentBooking,
  UpcomingTrip,
  RevenueDataPoint,
  StatusCount,
} from '../model/types';

/**
 * Handle auth-expiry errors by detecting 401/403/PGRST301 codes.
 * Signs out the user to force re-login, consistent with all prior plan patterns.
 *
 * @param error - The error thrown from Supabase query
 */
function handleAuthExpiry(error: unknown): void {
  const msg = error instanceof Error ? error.message : '';
  const code = (error as { code?: string })?.code;
  if (code === 'PGRST301' || msg.includes('401') || msg.includes('403')) {
    supabase.auth.signOut();
  }
}

// Copied SELECT strings to avoid FSD cross-import violations
const BOOKING_SELECT =
  '*, customer:customers!inner(id, full_name, phone_number), trip:trips(id, departure_time, route:routes(id, name, origin_station:stations!routes_origin_station_fk(id, name), destination_station:stations!routes_destination_station_fk(id, name)), vehicle:vehicles(id, license_plate, vehicle_type:vehicle_types(id, name, seat_layout, total_seats)))';

const TRIP_SELECT =
  '*, route:routes(id, name, origin_station:stations!routes_origin_station_fk(id, name), destination_station:stations!routes_destination_station_fk(id, name)), vehicle:vehicles(id, license_plate)';

/**
 * Fetch dashboard stats using Promise.allSettled for resilience.
 * If one query fails, others still return data — prevents entire dashboard from breaking.
 * Each result includes error state for individual stat card error handling.
 *
 * @returns DashboardStats with aggregated KPI data
 * @throws Rethrows non-auth errors; auth errors trigger signOut via handleAuthExpiry
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const todayStart = dayjs().startOf('day').toISOString();
  const todayEnd = dayjs().endOf('day').toISOString();

  // Use Promise.allSettled so partial failures don't kill the entire dashboard
  const [
    vehiclesResult,
    tripsResult,
    bookingsResult,
    revenueResult,
  ] = await Promise.allSettled([
    // vehicles: get all for status breakdown
    supabase.from('vehicles').select('status', { count: 'exact' }),

    // trips today: get all to compute status breakdown
    supabase
      .from('trips')
      .select('*', { count: 'exact' })
      .gte('departure_time', todayStart)
      .lte('departure_time', todayEnd),

    // bookings today: count only
    supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .gte('booking_date', todayStart)
      .lte('booking_date', todayEnd),

    // revenue today: sum completed payments
    supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('paid_at', todayStart)
      .lte('paid_at', todayEnd),
  ]);

  // Process vehicles result
  let vehicleTotal = 0;
  let vehicleActive = 0;
  if (vehiclesResult.status === 'fulfilled') {
    const { data, error } = vehiclesResult.value;
    if (error) {
      handleAuthExpiry(error);
      throw error;
    }
    vehicleTotal = data?.length ?? 0;
    vehicleActive = data?.filter((v: { status: string }) => v.status === 'active').length ?? 0;
  } else {
    handleAuthExpiry(vehiclesResult.reason);
  }

  // Process trips result
  let tripsToday = 0;
  let tripsScheduled = 0;
  let tripsInProgress = 0;
  if (tripsResult.status === 'fulfilled') {
    const { data, error } = tripsResult.value;
    if (error) {
      handleAuthExpiry(error);
      throw error;
    }
    const trips = data ?? [];
    tripsToday = trips.length;
    tripsScheduled = trips.filter((t: { status: string }) => t.status === 'scheduled').length;
    tripsInProgress = trips.filter((t: { status: string }) => t.status === 'in_progress').length;
  } else {
    handleAuthExpiry(tripsResult.reason);
  }

  // Process bookings result
  let bookingsToday = 0;
  if (bookingsResult.status === 'fulfilled') {
    const { data, error } = bookingsResult.value;
    if (error) {
      handleAuthExpiry(error);
      throw error;
    }
    bookingsToday = data?.length ?? 0;
  } else {
    handleAuthExpiry(bookingsResult.reason);
  }

  // Process revenue result
  let revenueToday = 0;
  if (revenueResult.status === 'fulfilled') {
    const { data, error } = revenueResult.value;
    if (error) {
      handleAuthExpiry(error);
      throw error;
    }
    // Sum amounts client-side
    revenueToday = data?.reduce((sum: number, p: { amount: number }) => sum + (p.amount ?? 0), 0) ?? 0;
  } else {
    handleAuthExpiry(revenueResult.reason);
  }

  return {
    vehicleTotal,
    vehicleActive,
    tripsToday,
    tripsScheduled,
    tripsInProgress,
    bookingsToday,
    revenueToday,
  };
}

/**
 * Fetch recent bookings for dashboard quick view.
 * Returns the 5 most recent bookings ordered by booking_date descending.
 *
 * @returns Array of recent bookings with details
 * @throws Rethrows non-auth errors; auth errors trigger signOut via handleAuthExpiry
 */
export async function fetchRecentBookings(): Promise<RecentBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT, { count: 'exact' })
    .order('booking_date', { ascending: false })
    .limit(5);

  if (error) {
    handleAuthExpiry(error);
    throw error;
  }

  return (data ?? []) as RecentBooking[];
}

/**
 * Fetch upcoming trips for dashboard quick view.
 * Returns the next 5 upcoming trips (departure_time >= now) ordered by departure_time ascending.
 *
 * @returns Array of upcoming trips with details
 * @throws Rethrows non-auth errors; auth errors trigger signOut via handleAuthExpiry
 */
export async function fetchUpcomingTrips(): Promise<UpcomingTrip[]> {
  const now = dayjs().toISOString();

  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_SELECT, { count: 'exact' })
    .gte('departure_time', now)
    .order('departure_time', { ascending: true })
    .limit(5);

  if (error) {
    handleAuthExpiry(error);
    throw error;
  }

  return (data ?? []) as UpcomingTrip[];
}

/**
 * Fetch revenue trend for the last 7 days.
 * Returns one data point per day with completed payment sum, filling zeros for days with no revenue.
 *
 * @returns Array of RevenueDataPoint for last 7 days
 * @throws Rethrows non-auth errors; auth errors trigger signOut via handleAuthExpiry
 */
export async function fetchRevenueTrend(): Promise<RevenueDataPoint[]> {
  const sevenDaysAgo = dayjs().subtract(7, 'day').startOf('day').toISOString();
  const todayEnd = dayjs().endOf('day').toISOString();

  const { data, error } = await supabase
    .from('payments')
    .select('amount, paid_at')
    .eq('status', 'completed')
    .gte('paid_at', sevenDaysAgo)
    .lte('paid_at', todayEnd)
    .order('paid_at');

  if (error) {
    handleAuthExpiry(error);
    throw error;
  }

  // Group by date and sum amounts client-side
  const revenueByDate = new Map<string, number>();
  (data ?? []).forEach((payment: { amount: number; paid_at: string }) => {
    const dateKey = dayjs(payment.paid_at).format('DD/MM/YYYY');
    const current = revenueByDate.get(dateKey) ?? 0;
    revenueByDate.set(dateKey, current + (payment.amount ?? 0));
  });

  // Fill in missing dates with 0
  const result: RevenueDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day');
    const dateKey = date.format('DD/MM/YYYY');
    result.push({
      date: date.format('DD/MM'),
      amount: revenueByDate.get(dateKey) ?? 0,
      fullDate: date.format('YYYY-MM-DD'),
    });
  }

  return result;
}

/**
 * Fetch trip status breakdown for the current month.
 * Returns count of trips grouped by status.
 *
 * @returns Array of StatusCount with trip status distribution
 * @throws Rethrows non-auth errors; auth errors trigger signOut via handleAuthExpiry
 */
export async function fetchTripStatusBreakdown(): Promise<StatusCount[]> {
  const monthStart = dayjs().startOf('month').toISOString();
  const monthEnd = dayjs().endOf('month').toISOString();

  const { data, error } = await supabase
    .from('trips')
    .select('status')
    .gte('departure_time', monthStart)
    .lte('departure_time', monthEnd);

  if (error) {
    handleAuthExpiry(error);
    throw error;
  }

  // Group by status client-side
  const statusMap = new Map<string, number>();
  (data ?? []).forEach((trip: { status: string }) => {
    const current = statusMap.get(trip.status) ?? 0;
    statusMap.set(trip.status, current + 1);
  });

  // Convert to array
  return Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));
}

/**
 * Fetch booking status breakdown for the current month.
 * Returns count of bookings grouped by status.
 *
 * @returns Array of StatusCount with booking status distribution
 * @throws Rethrows non-auth errors; auth errors trigger signOut via handleAuthExpiry
 */
export async function fetchBookingStatusBreakdown(): Promise<StatusCount[]> {
  const monthStart = dayjs().startOf('month').toISOString();
  const monthEnd = dayjs().endOf('month').toISOString();

  const { data, error } = await supabase
    .from('bookings')
    .select('status')
    .gte('booking_date', monthStart)
    .lte('booking_date', monthEnd);

  if (error) {
    handleAuthExpiry(error);
    throw error;
  }

  // Group by status client-side
  const statusMap = new Map<string, number>();
  (data ?? []).forEach((booking: { status: string }) => {
    const current = statusMap.get(booking.status) ?? 0;
    statusMap.set(booking.status, current + 1);
  });

  // Convert to array
  return Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));
}
