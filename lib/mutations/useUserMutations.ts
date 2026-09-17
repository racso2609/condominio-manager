"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  updateUser,
  preregisterResident,
  PreregisterResidentParams,
} from "@/lib/services/userService";
import { AppUser } from "@/lib/types";
import { queryKeys } from "@/lib/queries/keys";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; email: string; photoURL?: string | null };
    }) => createUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(variables.id),
      });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<
        Pick<
          AppUser,
          "name" | "photoURL" | "role" | "phone" | "document_id" | "notes"
        >
      >;
    }) => updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.all(),
      });
    },
  });
}

export function usePreregisterResident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: PreregisterResidentParams) =>
      preregisterResident(params),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(result.userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.roles(variables.condominiumId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.units.detail(variables.unitId),
      });
    },
  });
}
