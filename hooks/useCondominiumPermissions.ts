"use client";

import { useAuthContext } from "@/context/authContext";
import { useCondominiumMembership } from "@/lib/queries/useCondominium";

export function useCondominiumPermissions(condominiumId?: string) {
  const { appUser } = useAuthContext();

  const { data: membership, isLoading } = useCondominiumMembership(
    appUser?.id,
    condominiumId,
    appUser?.role
  );

  const role = membership?.role ?? "none";
  const userRole = membership?.userRole ?? null;
  const managedBuildingIds = membership?.managedBuildingIds ?? [];

  const isSuperAdmin = role === "super_admin";
  const isCondoAdmin = role === "super_admin" || role === "condo_admin";
  const isBuildingManager = role === "building_manager";
  const isResident = role === "resident";
  const isPending = role === "pending";

  const isAdminOrManager = isCondoAdmin || isBuildingManager;

  const canManageBuilding = (buildingId: string) =>
    isCondoAdmin || managedBuildingIds.includes(buildingId);

  return {
    appUser,
    role,
    userRole,
    isSuperAdmin,
    isCondoAdmin,
    isBuildingManager,
    isResident,
    isPending,
    isAdminOrManager,
    managedBuildingIds,
    canManageBuilding,
    canManageCondoLevel: isCondoAdmin,
    isLoading,
  };
}
