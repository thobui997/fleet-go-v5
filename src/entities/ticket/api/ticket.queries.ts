import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTripBookedSeats, fetchTicketsByBookingCode, checkInTicket, checkInAllTickets } from './ticket.api';

export function useTripBookedSeats(tripId: string) {
  return useQuery({
    queryKey: ['trip-booked-seats', tripId],
    queryFn: () => fetchTripBookedSeats(tripId),
    enabled: !!tripId,
  });
}

export function useTicketsByBookingCode(bookingCode: string) {
  return useQuery({
    queryKey: ['tickets-by-booking-code', bookingCode],
    queryFn: () => fetchTicketsByBookingCode(bookingCode),
    enabled: bookingCode.length > 0,
  });
}

export function useCheckInTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => checkInTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-booked-seats'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-by-booking-code'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useCheckInAllTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => checkInAllTickets(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-booked-seats'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-by-booking-code'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
