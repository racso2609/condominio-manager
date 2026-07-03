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
    mutationFn: deleteAnnouncement,
    onSuccess: (id) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.detail(id),
      });
    },
  });
}
