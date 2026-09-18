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
  updateUnitAliquot,
  batchUpdateAliquots,
  renameUnit,
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.all(),
      });
    },
  });
}

export function useClaimUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ unitId, userId }: { unitId: string; userId: string }) =>
      claimUnit(unitId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.all(),
      });
    },
  });
}

export function useRejectUnitClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectUnitClaim,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.all(),
      });
    },
  });
}

export function useVerifyUnitOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyUnitOwner,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.all(),
      });
    },
  });
}

export function useAssignUnitOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ unitId, userId }: { unitId: string; userId: string }) =>
      assignUnitOwner(unitId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.all(),
      });
    },
  });
}

export function useRemoveUnitOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeUnitOwner,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.all(),
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

export function useUpdateUnitAliquot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ unitId, aliquot }: { unitId: string; aliquot: number | null }) =>
      updateUnitAliquot(unitId, aliquot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.units.all() });
    },
  });
}

export function useBatchUpdateAliquots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: { id: string; aliquot: number | null }[]) =>
      batchUpdateAliquots(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.units.all() });
    },
  });
}

export function useRenameUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ unitId, newNum }: { unitId: string; newNum: string }) =>
      renameUnit(unitId, newNum),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.units.all() });
    },
  });
}
