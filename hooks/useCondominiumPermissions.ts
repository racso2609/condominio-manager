"use client";

import { useAuthContext } from "@/context/authContext";
import {
  useUserCondominiumRole,
  useManagedBuildingIds,
} from "@/lib/queries/useCondominium";

const EMPTY_IDS: string[] = [];

export function useCondominiumPermissions(condominiumId?: string) {
  const { appUser } = useAuthContext();

  const { data: userRole, isLoading: roleLoading } = useUserCondominiumRole(
    appUser?.id,
    condominiumId
  );
  const { data: managedBuildingIdsData, isLoading: managedLoading } =
    useManagedBuildingIds(appUser?.id, condominiumId);
  const managedBuildingIds = managedBuildingIdsData ?? EMPTY_IDS;

  const isGlobalAdmin =
    appUser?.role === "admin" || appUser?.role === "administrator";

  const isVerifiedCondoAdmin =
    userRole?.role === "administrator" &&
    userRole?.status === "verified" &&
    managedBuildingIds.length === 0;

  const isCondoAdmin = isGlobalAdmin || isVerifiedCondoAdmin;

  const isBuildingManager =
    userRole?.role === "administrator" &&
    userRole?.status === "verified" &&
    managedBuildingIds.length > 0;

  const isAdminOrManager = isCondoAdmin || isBuildingManager;

  const canManageBuilding = (buildingId: string) =>
    isCondoAdmin || managedBuildingIds.includes(buildingId);

  return {
    appUser,
    userRole,
    isCondoAdmin,
    isBuildingManager,
    isAdminOrManager,
    managedBuildingIds,
    canManageBuilding,
    canManageCondoLevel: isCondoAdmin,
    isLoading: roleLoading || managedLoading,
  };
}
