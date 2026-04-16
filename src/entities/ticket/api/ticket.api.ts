import { supabase } from '@shared/api';
import type { TicketWithBooking, Ticket } from '../model/types';

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

/**
 * Fetch tickets and booking info by booking code.
 * Used by check-in page to lookup booking and display tickets.
 *
 * @param bookingCode - Booking code (e.g., "BKG-ABCDE")
 * @returns Object with booking details and tickets array
 * @throws Error with PGRST116 if booking not found
 */
export async function fetchTicketsByBookingCode(
  bookingCode: string
): Promise<{ booking: TicketWithBooking['booking']; tickets: TicketWithBooking[] }> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, booking_code, status, notes, customer:customers!inner(full_name, phone_number), trip:trips(departure_time, route:routes(name)), tickets!tickets_booking_id_fkey(id, seat_number, passenger_name, passenger_phone, price, status, qr_code)'
    )
    .eq('booking_code', bookingCode)
    .single();

  if (error) throw error;

  const booking = data as any;
  const tickets: TicketWithBooking[] = (booking.tickets ?? []).map((t: any) => ({
    id: t.id,
    booking_id: booking.id,
    seat_number: t.seat_number,
    passenger_name: t.passenger_name,
    passenger_phone: t.passenger_phone,
    price: t.price,
    status: t.status,
    qr_code: t.qr_code,
    booking: {
      booking_code: booking.booking_code,
      status: booking.status,
      customer: booking.customer,
      trip: booking.trip,
    },
  }));

  return {
    booking: {
      booking_code: booking.booking_code,
      status: booking.status,
      customer: booking.customer,
      trip: booking.trip,
    },
    tickets,
  };
}

/**
 * Check-in a single ticket (mark as used).
 *
 * @param ticketId - Ticket UUID
 * @returns Updated ticket
 * @throws Error if ticket already processed or not found
 */
export async function checkInTicket(ticketId: string): Promise<Ticket> {
  const { data, error } = await supabase
    .from('tickets')
    .update({ status: 'used' })
    .eq('id', ticketId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Ticket already processed or not found');

  return data as Ticket;
}

/**
 * Check-in all active tickets for a booking.
 *
 * @param bookingId - Booking UUID
 */
export async function checkInAllTickets(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('tickets')
    .update({ status: 'used' })
    .eq('booking_id', bookingId)
    .eq('status', 'active');

  if (error) throw error;
}
