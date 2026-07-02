"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/lib/services/paymentMethodService";
import { queryKeys } from "@/lib/queries/keys";

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPaymentMethod,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentMethods.byCondominium(variables.condominium),
      });
    },
  });
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      condominiumId,
      data,
    }: {
      id: string;
      condominiumId: string;
      data: Parameters<typeof updatePaymentMethod>[2];
    }) => updatePaymentMethod(id, condominiumId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentMethods.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentMethods.byCondominium(
          variables.condominiumId
        ),
      });
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentMethods.all(),
      });
    },
  });
}
