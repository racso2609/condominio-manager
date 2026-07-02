import {
  useQuery,
  useQueries,
  UseQueryOptions,
  skipToken,
} from "@tanstack/react-query";
import {
  getExpenseEntry,
  getEntriesByExpense,
  getEntriesByUnit,
  getEntriesByUnits,
} from "@/lib/services/expenseEntryService";
import { ExpenseEntry } from "@/lib/types";
import { queryKeys } from "./keys";

export function useExpenseEntry(id?: string) {
  return useQuery({
    queryKey: queryKeys.expenseEntries.detail(id ?? ""),
    queryFn: id ? () => getExpenseEntry(id) : skipToken,
    enabled: Boolean(id),
  });
}

export function useEntriesByExpense(expenseId?: string) {
  return useQuery({
    queryKey: queryKeys.expenseEntries.byExpense(expenseId ?? ""),
    queryFn: expenseId ? () => getEntriesByExpense(expenseId) : skipToken,
    enabled: Boolean(expenseId),
  });
}

export function useEntriesByUnit(unitId?: string) {
  return useQuery({
    queryKey: queryKeys.expenseEntries.byUnit(unitId ?? ""),
    queryFn: unitId ? () => getEntriesByUnit(unitId) : skipToken,
    enabled: Boolean(unitId),
  });
}

export function useEntriesByUnits(unitIds: string[]) {
  return useQuery({
    queryKey: queryKeys.expenseEntries.byUnits(unitIds),
    queryFn:
      unitIds.length > 0 ? () => getEntriesByUnits(unitIds) : skipToken,
    enabled: unitIds.length > 0,
  });
}

export function useExpenseEntries(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.expenseEntries.detail(id),
      queryFn: () => getExpenseEntry(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<ExpenseEntry | null, Error, ExpenseEntry | null, ReturnType<typeof queryKeys.expenseEntries.detail>>[],
  });
}
