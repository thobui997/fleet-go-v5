export interface Ticket {
  id: string;
  booking_id: string;
  trip_id: string;
  seat_number: string;
  passenger_name: string;
  passenger_id_card: string | null;
  passenger_phone: string | null;
  price: number;
  status: string; // 'active' | 'used' | 'cancelled' | 'refunded'
  qr_code: string | null;
  issued_by: string | null;
  created_at: string; // ISO timestamptz
  updated_at: string; // ISO timestamptz
}

export type TicketInsert = Omit<
  Ticket,
  'id' | 'created_at' | 'updated_at' | 'qr_code' | 'issued_by'
>;

export type TicketUpdate = Partial<TicketInsert>;
