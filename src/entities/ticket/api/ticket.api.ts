import { supabase } from '@shared/api';

/**
 * Fetch booked seat numbers for a trip.
 * Returns seat numbers for all active or used tickets on the trip.
 * Used by booking creation dialog to show seat availability.
 *
 * @param tripId - Trip UUID
 * @returns Array of booked seat numbers (e.g., ['A01', 'B02', 'C03'])
 * @throws Error with status/code for auth-expiry handling (401/403/PGRST301)
 */
export async function fetchTripBookedSeats(tripId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('seat_number')
    .eq('trip_id', tripId)
    .in('status', ['active', 'used']);

  if (error) throw error;

  return (data ?? []).map(t => t.seat_number);
}
