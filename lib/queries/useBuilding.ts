import {
  useQuery,
  useQueries,
  UseQueryOptions,
  skipToken,
} from "@tanstack/react-query";
import {
  getBuilding,
  getBuildingsByCondominium,
} from "@/lib/services/buildingService";
import { Building } from "@/lib/types";
import { queryKeys } from "./keys";

export function useBuilding(id?: string) {
  return useQuery({
    queryKey: queryKeys.buildings.detail(id ?? ""),
    queryFn: id ? () => getBuilding(id) : skipToken,
    enabled: Boolean(id),
  });
}

export function useBuildingsByCondominium(condominiumId?: string) {
  return useQuery({
    queryKey: queryKeys.buildings.byCondominium(condominiumId ?? ""),
    queryFn: condominiumId
      ? () => getBuildingsByCondominium(condominiumId)
      : skipToken,
    enabled: Boolean(condominiumId),
  });
}

export function useBuildings(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.buildings.detail(id),
      queryFn: () => getBuilding(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<Building | null, Error, Building | null, ReturnType<typeof queryKeys.buildings.detail>>[],
  });
}
