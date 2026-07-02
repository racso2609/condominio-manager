"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createExpenseEntry,
  createExpenseEntries,
  reportPayment,
  markEntryAsPaid,
  deleteEntriesByExpense,
} from "@/lib/services/expenseEntryService";
import { queryKeys } from "@/lib/queries/keys";

export function useCreateExpenseEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExpenseEntry,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenseEntries.byExpense(variables.expense),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenseEntries.byUnit(variables.unit),
      });
    },
  });
}

export function useCreateExpenseEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      expenseId,
      unitAmounts,
    }: {
      expenseId: string;
      unitAmounts: { unit: string; amount: number }[];
    }) => createExpenseEntries(expenseId, unitAmounts),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenseEntries.byExpense(variables.expenseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.detail(variables.expenseId),
      });
    },
  });
}

export function useReportPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      data,
    }: {
      entryId: string;
      data: Parameters<typeof reportPayment>[1];
    }) => reportPayment(entryId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenseEntries.detail(variables.entryId),
      });
    },
  });
}

export function useMarkEntryAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data?: Parameters<typeof markEntryAsPaid>[1];
    }) => markEntryAsPaid(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenseEntries.detail(variables.id),
      });
    },
  });
}

export function useDeleteEntriesByExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEntriesByExpense,
    onSuccess: (_, expenseId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenseEntries.byExpense(expenseId),
      });
    },
  });
}
