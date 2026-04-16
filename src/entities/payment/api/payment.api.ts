import { supabase } from '@shared/api';
import type {
  PaymentListParams,
  PaymentWithDetails,
  PaymentStatus,
  UpdatePaymentStatusInput,
} from '../model/types';

const PAYMENT_SELECT =
  '*, booking:bookings!inner(id, booking_code, customer:customers!inner(id, full_name, phone_number)), processed_by_profile:profiles(id, full_name)';

export async function fetchPayments(
  params: PaymentListParams,
): Promise<{ data: PaymentWithDetails[]; count: number }> {
  const { page, pageSize, status, method, dateFrom, dateTo, search } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('payments')
    .select(PAYMENT_SELECT, { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (method) {
    query = query.eq('method', method);
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const q = (search ?? '').trim();
  if (q) {
    query = query.ilike('booking.booking_code', `%${q}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: (data ?? []) as PaymentWithDetails[], count: count ?? 0 };
}

export async function fetchPaymentByBooking(
  bookingId: string,
): Promise<PaymentWithDetails | null> {
  const { data, error } = await supabase
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error) throw error;

  return data as PaymentWithDetails | null;
}

export async function updatePaymentStatus(
  id: string,
  input: UpdatePaymentStatusInput,
): Promise<PaymentWithDetails> {
  // First, fetch current payment to validate transition
  const { data: currentPayment, error: fetchError } = await supabase
    .from('payments')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const currentStatus = currentPayment.status as PaymentStatus;
  const targetStatus = input.status;

  // Validate allowed transitions
  const allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    pending: ['completed', 'failed'],
    completed: ['refunded'],
    failed: [],
    refunded: [],
  };

  if (!allowedTransitions[currentStatus]?.includes(targetStatus)) {
    throw new Error(`Không thể chuyển trạng thái từ ${currentStatus} sang ${targetStatus}`);
  }

  // Build update object with conditional timestamp logic
  const updateData: Record<string, unknown> = {
    status: targetStatus,
    processed_by: input.processed_by,
  };

  if (targetStatus === 'completed') {
    updateData.paid_at = new Date().toISOString();
  } else if (targetStatus === 'failed') {
    // Do not set paid_at for failed payments
  } else if (targetStatus === 'refunded') {
    updateData.refunded_at = new Date().toISOString();
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }
  }

  const { error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;

  // Fetch and return updated payment
  const { data: updatedPayment, error: fetchUpdatedError } = await supabase
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('id', id)
    .single();

  if (fetchUpdatedError) throw fetchUpdatedError;

  return updatedPayment as PaymentWithDetails;
}
