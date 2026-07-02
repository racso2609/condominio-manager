"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAnnouncement,
  deleteAnnouncement,
} from "@/lib/services/announcementService";
import { queryKeys } from "@/lib/queries/keys";

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.byCondominium(variables.condominium),
      });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      condominiumId,
    }: {
      id: string;
      condominiumId: string;
    }) => deleteAnnouncement(id, condominiumId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.byCondominium(
          variables.condominiumId
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.detail(variables.id),
      });
    },
  });
}
