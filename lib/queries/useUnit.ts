import {
  useQuery,
  useQueries,
  UseQueryOptions,
  skipToken,
} from "@tanstack/react-query";
import {
  getUnit,
  getUnitsByBuilding,
  getUnitsByOwner,
  getUnitsByOwnerStatus,
  getPendingUnitsByBuilding,
} from "@/lib/services/unitService";
import { Unit } from "@/lib/types";
import { queryKeys } from "./keys";

export function useUnit(id?: string) {
  return useQuery({
    queryKey: queryKeys.units.detail(id ?? ""),
    queryFn: id ? () => getUnit(id) : skipToken,
    enabled: Boolean(id),
  });
}

export function useUnitsByBuilding(buildingId?: string) {
  return useQuery({
    queryKey: queryKeys.units.byBuilding(buildingId ?? ""),
    queryFn: buildingId ? () => getUnitsByBuilding(buildingId) : skipToken,
    enabled: Boolean(buildingId),
  });
}

export function useUnitsByBuildings(buildingIds: string[]) {
  return useQueries({
    queries: buildingIds.map((id) => ({
      queryKey: queryKeys.units.byBuilding(id),
      queryFn: () => getUnitsByBuilding(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<Unit[], Error, Unit[], ReturnType<typeof queryKeys.units.byBuilding>>[],
  });
}

export function useUnitsByOwner(userId?: string) {
  return useQuery({
    queryKey: queryKeys.units.byOwner(userId ?? ""),
    queryFn: userId ? () => getUnitsByOwner(userId) : skipToken,
    enabled: Boolean(userId),
  });
}

export function useUnitsByOwners(userIds: string[]) {
  return useQueries({
    queries: userIds.map((id) => ({
      queryKey: queryKeys.units.byOwner(id),
      queryFn: () => getUnitsByOwner(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<Unit[], Error, Unit[], ReturnType<typeof queryKeys.units.byOwner>>[],
  });
}

export function useUnitsByOwnerStatus(status?: "pending" | "verified") {
  return useQuery({
    queryKey: queryKeys.units.byOwnerStatus(status ?? "pending"),
    queryFn: status ? () => getUnitsByOwnerStatus(status) : skipToken,
    enabled: Boolean(status),
  });
}

export function usePendingUnitsByBuilding(buildingId?: string) {
  return useQuery({
    queryKey: queryKeys.units.pendingByBuilding(buildingId ?? ""),
    queryFn: buildingId
      ? () => getPendingUnitsByBuilding(buildingId)
      : skipToken,
    enabled: Boolean(buildingId),
  });
}

export function useUnits(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.units.detail(id),
      queryFn: () => getUnit(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<Unit | null, Error, Unit | null, ReturnType<typeof queryKeys.units.detail>>[],
  });
}
