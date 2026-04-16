import { supabase } from '@shared/api';
import type {
  ScheduleItem,
  StaffConflict,
  StaffRole,
  TripStaffInsert,
  TripStaffWithDetails,
} from '../model/types';

const STAFF_SELECT =
  '*, employee:employees(id, user_id, is_active, profiles(id, full_name, email, phone))';

export async function fetchTripStaff(
  tripId: string
): Promise<TripStaffWithDetails[]> {
  const { data, error } = await supabase
    .from('trip_staff')
    .select(STAFF_SELECT)
    .eq('trip_id', tripId)
    .order('role', { ascending: true });

  if (error) throw error;

  return (data ?? []) as TripStaffWithDetails[];
}

export async function addTripStaff(
  input: TripStaffInsert
): Promise<TripStaffWithDetails> {
  const { data, error } = await supabase
    .from('trip_staff')
    .insert(input)
    .select(STAFF_SELECT)
    .single();

  if (error) throw error;

  return data as TripStaffWithDetails;
}

export async function removeTripStaff(
  tripId: string,
  employeeId: string
): Promise<void> {
  const { error } = await supabase
    .from('trip_staff')
    .delete()
    .eq('trip_id', tripId)
    .eq('employee_id', employeeId);

  if (error) throw error;
}

export async function fetchStaffConflicts(
  employeeId: string,
  departureTime: string,
  arrivalTime: string,
  excludeTripId?: string
): Promise<StaffConflict[]> {
  const { data, error } = await supabase
    .from('trip_staff')
    .select(
      'trip_id, role, trips(id, departure_time, estimated_arrival_time, status, route:routes(name))'
    )
    .eq('employee_id', employeeId);

  if (error) throw error;

  // Client-side filter for status, exclude trip, and time overlap
  const conflicts: StaffConflict[] = [];

  for (const row of data ?? []) {
    const trip = row.trips as any;
    if (!trip) continue;

    // Skip if excluded trip
    if (trip.id === excludeTripId) continue;

    // Only check scheduled or in_progress trips
    if (trip.status !== 'scheduled' && trip.status !== 'in_progress') {
      continue;
    }

    // Check time overlap
    const depart = new Date(departureTime);
    const arrive = new Date(arrivalTime);
    const tripDepart = new Date(trip.departure_time);
    const tripArrive = new Date(trip.estimated_arrival_time);

    const overlaps = depart < tripArrive && arrive > tripDepart;

    if (overlaps) {
      conflicts.push({
        trip_id: trip.id,
        role: row.role as StaffRole,
        trip: {
          id: trip.id,
          departure_time: trip.departure_time,
          estimated_arrival_time: trip.estimated_arrival_time,
          route: trip.route,
        },
      });
    }
  }

  return conflicts;
}

/**
 * Fetch trips assigned to an employee for "My Schedule" page.
 *
 * Step 1: Find employee record for the user
 * Step 2: If PGRST116 (no employee record), return empty array (expected case)
 * Step 3: Fetch trip_staff with trip details for that employee
 * Step 4: Sort client-side by departure_time (PostgREST nested join ordering unreliable)
 *
 * @param userId - Supabase auth user ID
 * @returns Array of schedule items, empty if user has no employee record
 * @throws Error with status/code for auth-expiry handling (401/403/PGRST301)
 */
export async function fetchMySchedule(
  userId: string
): Promise<ScheduleItem[]> {
  // Step 1: Find employee for this user
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  // Step 2: PGRST116 = no employee row (expected case for non-employee users)
  if (employeeError?.code === 'PGRST116') {
    return [];
  }

  // Re-throw other errors
  if (employeeError) {
    // Note: PostgrestError doesn't have status property
    throw employeeError;
  }

  const employeeId = employee!.id;

  // Step 3: Fetch trip_staff with trip details
  const { data, error } = await supabase
    .from('trip_staff')
    .select(
      'role, notes, trip:trips(id, departure_time, estimated_arrival_time, status, price_override, route:routes(id, name, origin_station:stations!routes_origin_station_fk(id, name), destination_station:stations!routes_destination_station_fk(id, name)), vehicle:vehicles(id, license_plate))'
    )
    .eq('employee_id', employeeId);

  if (error) {
    // Note: PostgrestError doesn't have status property
    throw error;
  }

  // Step 4: Sort client-side by departure_time (PostgREST ordering unreliable for nested joins)
  const results = (data ?? []) as any[];
  results.sort(
    (a, b) =>
      new Date(a.trip.departure_time).getTime() -
      new Date(b.trip.departure_time).getTime()
  );

  return results as ScheduleItem[];
}
