import { supabase } from '@shared/api';
import type {
  BookingInsert,
  BookingListParams,
  BookingWithDetails,
} from '../model/types';

const BOOKING_SELECT =
  '*, customer:customers!inner(id, full_name, phone_number), trip:trips(id, departure_time, route:routes(id, name, origin_station:stations!routes_origin_station_fk(id, name), destination_station:stations!routes_destination_station_fk(id, name)), vehicle:vehicles(id, license_plate, vehicle_type:vehicle_types(id, name, seat_layout, total_seats)))';

const BOOKING_WITH_TICKETS_SELECT =
  '*, customer:customers!inner(id, full_name, phone_number), trip:trips(id, departure_time, route:routes(id, name, origin_station:stations!routes_origin_station_fk(id, name), destination_station:stations!routes_destination_station_fk(id, name)), vehicle:vehicles(id, license_plate, vehicle_type:vehicle_types(id, name, seat_layout, total_seats))), tickets!tickets_booking_id_fkey(id, seat_number, passenger_name, passenger_phone, passenger_id_card, price, status, qr_code)';

export async function fetchBookings(
  params: BookingListParams,
): Promise<{ data: BookingWithDetails[]; count: number }> {
  const { page, pageSize, status, dateFrom, dateTo, search } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('bookings')
    .select(BOOKING_SELECT, { count: 'exact' })
    .range(from, to)
    .order('booking_date', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (dateFrom) {
    query = query.gte('booking_date', dateFrom);
  }

  if (dateTo) {
    query = query.lte('booking_date', dateTo);
  }

  const q = (search ?? '').trim();
  if (q) {
    query = query.or(`booking_code.ilike.%${q}%,customer.full_name.ilike.%${q}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: (data ?? []) as BookingWithDetails[], count: count ?? 0 };
}

export async function fetchBooking(id: string): Promise<BookingWithDetails & { tickets: Array<{
  id: string;
  seat_number: string;
  passenger_name: string;
  passenger_phone: string | null;
  passenger_id_card: string | null;
  price: number;
  status: string;
  qr_code: string | null;
}> }> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_WITH_TICKETS_SELECT)
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as BookingWithDetails & { tickets: Array<{
    id: string;
    seat_number: string;
    passenger_name: string;
    passenger_phone: string | null;
    passenger_id_card: string | null;
    price: number;
    status: string;
    qr_code: string | null;
  }>};
}

export interface CreateBookingInput {
  booking: BookingInsert;
  tickets: Array<{
    trip_id: string;
    seat_number: string;
    passenger_name: string;
    passenger_phone?: string;
    passenger_id_card?: string;
    price: number;
  }>;
}

export async function createBookingWithTickets(
  input: CreateBookingInput,
): Promise<BookingWithDetails> {
  // Step 1: Insert booking first (get booking_code from response)
  const total_amount = input.tickets.reduce((sum, t) => sum + t.price, 0);
  const passenger_count = input.tickets.length;

  const { data: bookingData, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      ...input.booking,
      total_amount,
      passenger_count,
    })
    .select()
    .single();

  if (bookingError) {
    throw bookingError;
  }

  const booking = bookingData as { id: string; booking_code: string };

  // Step 2: Insert tickets with booking_id and qr_code
  const ticketsToInsert = input.tickets.map(t => ({
    ...t,
    booking_id: booking.id,
    qr_code: `${booking.booking_code}-${t.seat_number.trim()}`,
  }));

  const { error: ticketsError } = await supabase
    .from('tickets')
    .insert(ticketsToInsert);

  // Step 3: Compensating transaction — delete orphaned booking if ticket insert fails
  if (ticketsError) {
    await supabase.from('bookings').delete().eq('id', booking.id);
    throw ticketsError;
  }

  return fetchBooking(booking.id);
}

export async function cancelBooking(id: string): Promise<void> {
  // Update booking status='cancelled', cancelled_at=now()
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (bookingError) throw bookingError;

  // Update tickets status='cancelled' WHERE booking_id=id AND status IN ('active')
  const { error: ticketsError } = await supabase
    .from('tickets')
    .update({ status: 'cancelled' })
    .eq('booking_id', id)
    .in('status', ['active']);

  if (ticketsError) throw ticketsError;

  // Update payment:
  //   status='refunded', refunded_at=now() WHERE booking_id=id AND status='completed'
  //   status='failed' WHERE booking_id=id AND status='pending'
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('booking_id', id)
    .eq('status', 'completed');

  if (paymentError) throw paymentError;

  const { error: paymentPendingError } = await supabase
    .from('payments')
    .update({ status: 'failed' })
    .eq('booking_id', id)
    .eq('status', 'pending');

  if (paymentPendingError) throw paymentPendingError;
}

export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase.from('bookings').delete().eq('id', id);

  if (error) throw error;
}
