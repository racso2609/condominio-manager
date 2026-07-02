"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createComplaint,
  updateComplaintStatus,
  deleteComplaint,
} from "@/lib/services/complaintService";
import { ComplaintStatus } from "@/lib/types";
import { queryKeys } from "@/lib/queries/keys";

export function useCreateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComplaint,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.complaints.byCondominium(variables.condominium),
      });
    },
  });
}

export function useUpdateComplaintStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      resolverId,
      resolutionNotes,
    }: {
      id: string;
      status: ComplaintStatus;
      resolverId?: string;
      resolutionNotes?: string;
    }) => updateComplaintStatus(id, status, resolverId, resolutionNotes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.complaints.detail(variables.id),
      });
    },
  });
}

export function useDeleteComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      condominiumId,
    }: {
      id: string;
      condominiumId: string;
    }) => deleteComplaint(id, condominiumId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.complaints.byCondominium(variables.condominiumId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.complaints.detail(variables.id),
      });
    },
  });
}
