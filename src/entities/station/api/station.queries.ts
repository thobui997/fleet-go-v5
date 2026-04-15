import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStation,
  deleteStation,
  fetchStation,
  fetchStations,
  updateStation,
} from './station.api';
import type {
  StationInsert,
  StationListParams,
  StationUpdate,
} from '../model/types';

export function useStations(params: StationListParams) {
  return useQuery({
    queryKey: ['stations', params],
    queryFn: () => fetchStations(params),
  });
}

export function useStation(id: string) {
  return useQuery({
    queryKey: ['stations', id],
    queryFn: () => fetchStation(id),
    enabled: !!id,
  });
}

export function useCreateStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StationInsert) => createStation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
  });
}

export function useUpdateStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StationUpdate }) =>
      updateStation(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
  });
}

export function useDeleteStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
  });
}
