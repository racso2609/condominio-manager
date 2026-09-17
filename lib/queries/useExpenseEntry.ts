import {
  useQuery,
  useQueries,
  UseQueryOptions,
  skipToken,
} from "@tanstack/react-query";
import {
  getExpenseEntry,
  getEntriesByExpense,
  getEntriesByExpenseAndBuilding,
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

export function useEntriesByExpenseAndBuilding(
  expenseId?: string,
  buildingId?: string,
  page = 1,
  pageSize = 10
) {
  return useQuery({
    queryKey: queryKeys.expenseEntries.byExpenseAndBuilding(
      expenseId ?? "",
      buildingId ?? "",
      page
    ),
    queryFn:
      expenseId && buildingId
        ? () =>
            getEntriesByExpenseAndBuilding(
              expenseId,
              buildingId,
              page,
              pageSize
            )
        : skipToken,
    enabled: Boolean(expenseId && buildingId),
  });
}

export function useEntriesByExpenses(expenseIds: string[]) {
  return useQueries({
    queries: expenseIds.map((id) => ({
      queryKey: queryKeys.expenseEntries.byExpense(id),
      queryFn: () => getEntriesByExpense(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<ExpenseEntry[], Error, ExpenseEntry[], ReturnType<typeof queryKeys.expenseEntries.byExpense>>[],
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
