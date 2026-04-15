import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRole,
  deleteRole,
  fetchRole,
  fetchRoles,
  updateRole,
} from './role.api';
import type { RoleInsert, RoleListParams, RoleUpdate } from '../model/types';

export function useRoles(params: RoleListParams) {
  return useQuery({
    queryKey: ['roles', params],
    queryFn: () => fetchRoles(params),
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: () => fetchRole(id),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RoleInsert) => createRole(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoleUpdate }) =>
      updateRole(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}
