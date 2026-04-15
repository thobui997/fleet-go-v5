import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRoute,
  deleteRoute,
  fetchRoute,
  fetchRoutes,
  updateRoute,
} from './route.api';
import type {
  RouteInsert,
  RouteListParams,
  RouteUpdate,
} from '../model/types';

export function useRoutes(params: RouteListParams) {
  return useQuery({
    queryKey: ['routes', params],
    queryFn: () => fetchRoutes(params),
  });
}

export function useRoute(id: string) {
  return useQuery({
    queryKey: ['routes', id],
    queryFn: () => fetchRoute(id),
    enabled: !!id,
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RouteInsert) => createRoute(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RouteUpdate }) =>
      updateRoute(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}
