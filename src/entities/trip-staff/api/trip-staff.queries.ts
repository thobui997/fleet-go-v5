import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addTripStaff,
  fetchStaffConflicts,
  fetchTripStaff,
  removeTripStaff,
} from './trip-staff.api';
import type { TripStaffInsert } from '../model/types';

export function useTripStaff(tripId: string) {
  return useQuery({
    queryKey: ['trip-staff', tripId],
    queryFn: () => fetchTripStaff(tripId),
    enabled: !!tripId,
  });
}

export function useAddTripStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TripStaffInsert) => addTripStaff(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-staff'] });
    },
  });
}

export function useRemoveTripStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, employeeId }: { tripId: string; employeeId: string }) =>
      removeTripStaff(tripId, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-staff'] });
    },
  });
}

export function useStaffConflicts(
  employeeId: string,
  departureTime: string,
  arrivalTime: string,
  excludeTripId?: string
) {
  return useQuery({
    queryKey: ['staff-conflicts', employeeId, departureTime, arrivalTime, excludeTripId],
    queryFn: () => fetchStaffConflicts(employeeId, departureTime, arrivalTime, excludeTripId),
    enabled: !!employeeId,
  });
}
