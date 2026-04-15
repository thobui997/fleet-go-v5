import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRouteStops, saveRouteStops } from './route-stop.api';
import type { RouteStopInsert } from '../model/types';

export function useRouteStops(routeId: string) {
  return useQuery({
    queryKey: ['route-stops', routeId],
    queryFn: () => fetchRouteStops(routeId),
    enabled: !!routeId,
  });
}

export function useSaveRouteStops() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      routeId,
      stops,
    }: {
      routeId: string;
      stops: RouteStopInsert[];
    }) => saveRouteStops(routeId, stops),
    onSuccess: (_data, { routeId }) => {
      queryClient.invalidateQueries({ queryKey: ['route-stops', routeId] });
    },
  });
}
