import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchPayments,
  fetchPaymentByBooking,
  updatePaymentStatus,
} from './payment.api';
import type { PaymentListParams, UpdatePaymentStatusInput } from '../model/types';

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => fetchPayments(params),
  });
}

export function usePaymentByBooking(bookingId: string) {
  return useQuery({
    queryKey: ['payment-by-booking', bookingId],
    queryFn: () => fetchPaymentByBooking(bookingId),
    enabled: !!bookingId,
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePaymentStatusInput }) =>
      updatePaymentStatus(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-by-booking'] });
    },
  });
}
