export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'] as const satisfies readonly PaymentStatus[];

export type PaymentMethod = 'cash' | 'e_wallet' | 'bank_transfer';

export const PAYMENT_METHODS = ['cash', 'e_wallet', 'bank_transfer'] as const satisfies readonly PaymentMethod[];

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transaction_reference: string | null;
  paid_at: string | null; // ISO timestamptz
  refunded_at: string | null; // ISO timestamptz
  processed_by: string | null;
  notes: string | null;
  created_at: string; // ISO timestamptz
  updated_at: string; // ISO timestamptz
}

export interface PaymentWithDetails extends Payment {
  booking: {
    id: string;
    booking_code: string;
    customer: {
      id: string;
      full_name: string;
      phone_number: string;
    };
  };
  processed_by_profile: {
    id: string;
    full_name: string;
  } | null;
}

export interface PaymentListParams {
  page: number;
  pageSize: number;
  status?: PaymentStatus;
  method?: PaymentMethod;
  dateFrom?: string; // ISO date string, filters on created_at
  dateTo?: string; // ISO date string, filters on created_at
  search?: string; // ilike on booking_code
}

export interface UpdatePaymentStatusInput {
  status: PaymentStatus;
  notes?: string;
  processed_by?: string;
}
