import { useQuery } from '@tanstack/react-query';
import { fetchTripBookedSeats } from './ticket.api';

export function useTripBookedSeats(tripId: string) {
  return useQuery({
    queryKey: ['trip-booked-seats', tripId],
    queryFn: () => fetchTripBookedSeats(tripId),
    enabled: !!tripId,
  });
}
