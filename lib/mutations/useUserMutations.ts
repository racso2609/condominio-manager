"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser, updateUser } from "@/lib/services/userService";
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
      data: Partial<Pick<AppUser, "name" | "photoURL" | "role" | "phone" >>;
    }) => updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(variables.id),
      });
    },
  });
}
