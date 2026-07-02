"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createUnit,
  generateUnits,
  updateUnitType,
  claimUnit,
  rejectUnitClaim,
  verifyUnitOwner,
  assignUnitOwner,
  removeUnitOwner,
  deleteUnit,
} from "@/lib/services/unitService";
import { queryKeys } from "@/lib/queries/keys";

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUnit,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.byBuilding(variables.building),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.buildings.detail(variables.building),
      });
    },
  });
}

export function useGenerateUnits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      buildingId,
      floors,
      unitsPerFloor,
      type,
      floorOffset,
      prefix,
      suffix,
    }: {
      buildingId: string;
      floors: number;
      unitsPerFloor: number;
      type: "residential" | "office";
      floorOffset?: number;
      prefix?: string;
      suffix?: string;
    }) =>
      generateUnits(
        buildingId,
        floors,
        unitsPerFloor,
        type,
        floorOffset,
        prefix,
        suffix
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.byBuilding(variables.buildingId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.buildings.detail(variables.buildingId),
      });
    },
  });
}

export function useUpdateUnitType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      type,
    }: {
      id: string;
      type: "residential" | "office";
    }) => updateUnitType(id, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.detail(variables.id),
      });
    },
  });
}

export function useClaimUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ unitId, userId }: { unitId: string; userId: string }) =>
      claimUnit(unitId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.detail(variables.unitId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.byOwner(variables.userId),
      });
    },
  });
}

export function useRejectUnitClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectUnitClaim,
    onSuccess: (_, unitId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.detail(unitId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.byOwnerStatus("pending"),
      });
    },
  });
}

export function useVerifyUnitOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyUnitOwner,
    onSuccess: (_, unitId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.detail(unitId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.byOwnerStatus("pending"),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.byOwnerStatus("verified"),
      });
    },
  });
}

export function useAssignUnitOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ unitId, userId }: { unitId: string; userId: string }) =>
      assignUnitOwner(unitId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.detail(variables.unitId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.byOwner(variables.userId),
      });
    },
  });
}

export function useRemoveUnitOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeUnitOwner,
    onSuccess: (_, unitId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.detail(unitId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.byOwnerStatus("verified"),
      });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.all(),
      });
    },
  });
}
