"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createBuilding,
  updateBuilding,
  deleteBuilding,
  duplicateBuilding,
} from "@/lib/services/buildingService";
import { queryKeys } from "@/lib/queries/keys";

export function useCreateBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBuilding,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.buildings.byCondominium(variables.condominium),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.detail(variables.condominium),
      });
    },
  });
}

export function useUpdateBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; symbol: string; address?: string };
    }) => updateBuilding(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.buildings.detail(variables.id),
      });
    },
  });
}

export function useDeleteBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBuilding,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.buildings.all(),
      });
    },
  });
}

export function useDuplicateBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sourceBuildingId,
      data,
    }: {
      sourceBuildingId: string;
      data: {
        condominium: string;
        name: string;
        symbol: string;
        address?: string;
      };
    }) => duplicateBuilding(sourceBuildingId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.buildings.byCondominium(variables.data.condominium),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.byBuilding(variables.sourceBuildingId),
      });
    },
  });
}
