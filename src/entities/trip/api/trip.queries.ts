import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTrip,
  deleteTrip,
  fetchTrip,
  fetchTrips,
  updateTrip,
} from './trip.api';
import type {
  TripInsert,
  TripListParams,
  TripUpdate,
} from '../model/types';

export function useTrips(params: TripListParams) {
  return useQuery({
    queryKey: ['trips', params],
    queryFn: () => fetchTrips(params),
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: ['trips', id],
    queryFn: () => fetchTrip(id),
    enabled: !!id,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TripInsert) => createTrip(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TripUpdate }) =>
      updateTrip(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
