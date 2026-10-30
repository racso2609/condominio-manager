import {
  useQuery,
  useQueries,
  UseQueryOptions,
  skipToken,
} from "@tanstack/react-query";
import {
  getUserCondominiums,
  getCondominium,
  getCondominiumRoles,
  getPendingRoles,
  getPendingInvitesByEmail,
  getInviteByToken,
  getUserCondominiumRole,
  getManagedBuildingIds,
  getBuildingManagers,
} from "@/lib/services/condominiumService";
import { Condominium } from "@/lib/types";
import { queryKeys } from "./keys";

export function useUserCondominiums(userId?: string, role?: string) {
  return useQuery({
    queryKey: queryKeys.condominiums.byUser(userId ?? "", role ?? ""),
    queryFn:
      userId && role
        ? () => getUserCondominiums(userId, role)
        : skipToken,
    enabled: Boolean(userId && role),
  });
}

export function useCondominium(id?: string) {
  return useQuery({
    queryKey: queryKeys.condominiums.detail(id ?? ""),
    queryFn: id ? () => getCondominium(id) : skipToken,
    enabled: Boolean(id),
  });
}

export function useCondominiums(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.condominiums.detail(id),
      queryFn: () => getCondominium(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<Condominium | null, Error, Condominium | null, ReturnType<typeof queryKeys.condominiums.detail>>[],
  });
}

export function useUserCondominiumRole(
  userId: string | undefined,
  condominiumId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.condominiums.userRole(
      condominiumId ?? "",
      userId ?? ""
    ),
    queryFn:
      userId && condominiumId
        ? () => getUserCondominiumRole(userId, condominiumId)
        : skipToken,
    enabled: Boolean(userId && condominiumId),
  });
}

export function useManagedBuildingIds(
  userId: string | undefined,
  condominiumId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.condominiums.managedBuildings(
      condominiumId ?? "",
      userId ?? ""
    ),
    queryFn:
      userId && condominiumId
        ? () => getManagedBuildingIds(userId, condominiumId)
        : skipToken,
    enabled: Boolean(userId && condominiumId),
  });
}

export function useBuildingManagers(condominiumId?: string) {
  return useQuery({
    queryKey: queryKeys.condominiums.buildingManagers(condominiumId ?? ""),
    queryFn: condominiumId
      ? () => getBuildingManagers(condominiumId)
      : skipToken,
    enabled: Boolean(condominiumId),
  });
}

export function useCondominiumRoles(condominiumId?: string) {
  return useQuery({
    queryKey: queryKeys.condominiums.roles(condominiumId ?? ""),
    queryFn: condominiumId ? () => getCondominiumRoles(condominiumId) : skipToken,
    enabled: Boolean(condominiumId),
  });
}

export function usePendingRoles(condominiumId?: string) {
  return useQuery({
    queryKey: queryKeys.condominiums.pendingRoles(condominiumId ?? ""),
    queryFn: condominiumId ? () => getPendingRoles(condominiumId) : skipToken,
    enabled: Boolean(condominiumId),
  });
}

export function usePendingInvitesByEmail(email?: string | null) {
  return useQuery({
    queryKey: queryKeys.condominiums.pendingInvites(email ?? ""),
    queryFn: email ? () => getPendingInvitesByEmail(email) : skipToken,
    enabled: Boolean(email),
  });
}

export function useInviteByToken(token?: string) {
  return useQuery({
    queryKey: queryKeys.condominiums.inviteByToken(token ?? ""),
    queryFn: token ? () => getInviteByToken(token) : skipToken,
    enabled: Boolean(token),
  });
}
