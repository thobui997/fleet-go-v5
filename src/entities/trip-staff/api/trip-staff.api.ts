import { supabase } from '@shared/api';
import type {
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
