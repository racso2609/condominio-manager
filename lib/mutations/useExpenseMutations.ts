"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/lib/services/expenseService";
import { queryKeys } from "@/lib/queries/keys";

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExpense,
    onSuccess: (_, variables) => {
      if (variables.condominium) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.expenses.byCondominium(variables.condominium),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.condominiums.detail(variables.condominium),
        });
      }
      if (variables.building) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.expenses.byBuilding(variables.building),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.buildings.detail(variables.building),
        });
      }
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateExpense>[1];
    }) => updateExpense(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.detail(variables.id),
      });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenseEntries.all(),
      });
    },
  });
}
