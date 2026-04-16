export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'] as const satisfies readonly BookingStatus[];

export interface Booking {
  id: string;
  booking_code: string;
  customer_id: string;
  trip_id: string;
  booking_date: string; // ISO timestamptz
  status: BookingStatus;
  total_amount: number;
  passenger_count: number;
  created_by: string | null;
  cancelled_at: string | null; // ISO timestamptz
  cancelled_by: string | null;
  notes: string | null;
  created_at: string; // ISO timestamptz
  updated_at: string; // ISO timestamptz
}

export interface BookingWithDetails extends Booking {
  customer: {
    id: string;
    full_name: string;
    phone_number: string;
  } | null;
  trip: {
    id: string;
    departure_time: string;
    route: {
      id: string;
      name: string;
      origin_station: { id: string; name: string } | null;
      destination_station: { id: string; name: string } | null;
    } | null;
    vehicle: {
      id: string;
      license_plate: string;
      vehicle_type: {
        id: string;
        name: string;
        seat_layout: Record<string, unknown>;
        total_seats: number;
      } | null;
    } | null;
  } | null;
}

export type BookingInsert = Omit<
  Booking,
  'id' | 'created_at' | 'updated_at' | 'booking_code' | 'cancelled_at' | 'cancelled_by'
> & {
  created_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
};

export type BookingUpdate = Partial<BookingInsert>;

export interface BookingListParams {
  page: number;
  pageSize: number;
  status?: BookingStatus;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  search?: string; // ilike on booking_code or customer.full_name
}
