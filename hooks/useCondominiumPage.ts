"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCondominium } from "@/lib/queries/useCondominium";
import { useCondominiumPermissions } from "@/hooks/useCondominiumPermissions";
import { Condominium } from "@/lib/types";

export function useCondominiumPage() {
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);

  const permissions = useCondominiumPermissions(condominiumId);

  useEffect(() => {
    if (!condominiumLoading && condominium === null) {
      router.replace("/home");
    }
  }, [condominiumLoading, condominium, router]);

  return {
    appUser: permissions.appUser,
    params,
    condominiumId,
    condominium: condominium as Condominium | null | undefined,
    condominiumLoading,
    role: permissions.role,
    isSuperAdmin: permissions.isSuperAdmin,
    isCondoAdmin: permissions.isCondoAdmin,
    isBuildingManager: permissions.isBuildingManager,
    isResident: permissions.isResident,
    isPending: permissions.isPending,
    isAdminOrManager: permissions.isAdminOrManager,
    managedBuildingIds: permissions.managedBuildingIds,
    canManageBuilding: permissions.canManageBuilding,
    permissionsLoading: permissions.isLoading,
  };
}
