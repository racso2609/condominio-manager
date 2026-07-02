"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCondominium,
  updateCondominiumStatus,
  createInvite,
  createGlobalInvite,
  acceptInvite,
  verifyRole,
  deleteCondominiumRole,
} from "@/lib/services/condominiumService";
import { queryKeys } from "@/lib/queries/keys";

export function useCreateCondominium() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCondominium,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.byUser(
          variables.creator,
          "administrator"
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.all(),
      });
    },
  });
}

export function useUpdateCondominiumStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "draft" | "complete";
    }) => updateCondominiumStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.all(),
      });
    },
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      condominiumId,
      invitedBy,
      email,
    }: {
      condominiumId: string;
      invitedBy: string;
      email: string;
    }) => createInvite(condominiumId, invitedBy, email),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.roles(variables.condominiumId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.pendingRoles(variables.condominiumId),
      });
    },
  });
}

export function useCreateGlobalInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      condominiumId,
      invitedBy,
    }: {
      condominiumId: string;
      invitedBy: string;
    }) => createGlobalInvite(condominiumId, invitedBy),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.roles(variables.condominiumId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.pendingRoles(variables.condominiumId),
      });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, userId }: { token: string; userId: string }) =>
      acceptInvite(token, userId),
    onSuccess: (role) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.inviteByToken(role.token ?? ""),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.all(),
      });
    },
  });
}

export function useVerifyRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyRole,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.all(),
      });
    },
  });
}

export function useDeleteCondominiumRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCondominiumRole,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.condominiums.all(),
      });
    },
  });
}
