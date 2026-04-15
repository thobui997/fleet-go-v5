import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEmployee,
  deleteEmployee,
  fetchEmployee,
  fetchEmployeeRole,
  fetchEmployees,
  fetchProfiles,
  updateEmployee,
} from './employee.api';
import type {
  EmployeeInsert,
  EmployeeListParams,
  EmployeeUpdate,
} from '../model/types';

export function useEmployees(params: EmployeeListParams) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => fetchEmployees(params),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => fetchEmployee(id),
    enabled: !!id,
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles-list'],
    queryFn: fetchProfiles,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployeeRole(userId: string | null) {
  return useQuery({
    queryKey: ['employee-role', userId],
    queryFn: () => fetchEmployeeRole(userId!),
    enabled: !!userId,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployeeInsert) => createEmployee(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EmployeeUpdate }) =>
      updateEmployee(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
