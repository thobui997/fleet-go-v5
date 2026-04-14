import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createVehicleType,
  deleteVehicleType,
  fetchVehicleType,
  fetchVehicleTypes,
  updateVehicleType,
} from './vehicle-type.api';
import type {
  VehicleTypeInsert,
  VehicleTypeListParams,
  VehicleTypeUpdate,
} from '../model/types';

export function useVehicleTypes(params: VehicleTypeListParams) {
  return useQuery({
    queryKey: ['vehicle-types', params],
    queryFn: () => fetchVehicleTypes(params),
  });
}

export function useVehicleType(id: string) {
  return useQuery({
    queryKey: ['vehicle-types', id],
    queryFn: () => fetchVehicleType(id),
    enabled: !!id,
  });
}

export function useCreateVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VehicleTypeInsert) => createVehicleType(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] });
    },
  });
}

export function useUpdateVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VehicleTypeUpdate }) =>
      updateVehicleType(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] });
    },
  });
}

export function useDeleteVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVehicleType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] });
    },
  });
}
