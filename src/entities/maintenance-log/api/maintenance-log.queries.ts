import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMaintenanceLog,
  deleteMaintenanceLog,
  fetchMaintenanceLog,
  fetchMaintenanceLogs,
  updateMaintenanceLog,
} from './maintenance-log.api';
import type {
  MaintenanceLogInsert,
  MaintenanceLogListParams,
  MaintenanceLogUpdate,
} from '../model/types';

export function useMaintenanceLogs(params: MaintenanceLogListParams) {
  return useQuery({
    queryKey: ['maintenance-logs', params],
    queryFn: () => fetchMaintenanceLogs(params),
  });
}

export function useMaintenanceLog(id: string) {
  return useQuery({
    queryKey: ['maintenance-logs', id],
    queryFn: () => fetchMaintenanceLog(id),
    enabled: !!id,
  });
}

export function useCreateMaintenanceLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MaintenanceLogInsert) => createMaintenanceLog(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
    },
  });
}

export function useUpdateMaintenanceLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: MaintenanceLogUpdate;
    }) => updateMaintenanceLog(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
    },
  });
}

export function useDeleteMaintenanceLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMaintenanceLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
    },
  });
}
