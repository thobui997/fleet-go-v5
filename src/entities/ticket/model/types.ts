export type TicketStatus = 'active' | 'used' | 'cancelled' | 'refunded';

export const TICKET_STATUSES = ['active', 'used', 'cancelled', 'refunded'] as const satisfies readonly TicketStatus[];

export interface Ticket {
  id: string;
  booking_id: string;
  trip_id: string;
  seat_number: string;
  passenger_name: string;
  passenger_id_card: string | null;
  passenger_phone: string | null;
  price: number;
  status: TicketStatus;
  qr_code: string | null;
  issued_by: string | null;
  created_at: string; // ISO timestamptz
  updated_at: string; // ISO timestamptz
}

export type TicketInsert = Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'issued_by'>;

export type TicketUpdate = Partial<TicketInsert>;

export interface TicketWithBooking {
  id: string;
  booking_id: string;
  seat_number: string;
  passenger_name: string;
  passenger_phone: string | null;
  price: number;
  status: TicketStatus;
  qr_code: string | null;
  booking: {
    booking_code: string;
    status: string;
    customer: { full_name: string; phone_number: string } | null;
    trip: {
      departure_time: string;
      route: { name: string } | null;
    } | null;
  };
}
