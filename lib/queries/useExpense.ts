import {
  useQuery,
  useQueries,
  UseQueryOptions,
  skipToken,
} from "@tanstack/react-query";
import {
  getExpense,
  getExpensesByCondominium,
  getExpensesByBuilding,
} from "@/lib/services/expenseService";
import { Expense } from "@/lib/types";
import { queryKeys } from "./keys";

export function useExpense(id?: string) {
  return useQuery({
    queryKey: queryKeys.expenses.detail(id ?? ""),
    queryFn: id ? () => getExpense(id) : skipToken,
    enabled: Boolean(id),
  });
}

export function useExpensesByCondominium(condominiumId?: string) {
  return useQuery({
    queryKey: queryKeys.expenses.byCondominium(condominiumId ?? ""),
    queryFn: condominiumId
      ? () => getExpensesByCondominium(condominiumId)
      : skipToken,
    enabled: Boolean(condominiumId),
  });
}

export function useExpensesByCondominiums(condominiumIds: string[]) {
  return useQueries({
    queries: condominiumIds.map((id) => ({
      queryKey: queryKeys.expenses.byCondominium(id),
      queryFn: () => getExpensesByCondominium(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<Expense[], Error, Expense[], ReturnType<typeof queryKeys.expenses.byCondominium>>[],
  });
}

export function useExpensesByBuilding(buildingId?: string) {
  return useQuery({
    queryKey: queryKeys.expenses.byBuilding(buildingId ?? ""),
    queryFn: buildingId ? () => getExpensesByBuilding(buildingId) : skipToken,
    enabled: Boolean(buildingId),
  });
}

export function useExpensesByBuildings(buildingIds: string[]) {
  return useQueries({
    queries: buildingIds.map((id) => ({
      queryKey: queryKeys.expenses.byBuilding(id),
      queryFn: () => getExpensesByBuilding(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<Expense[], Error, Expense[], ReturnType<typeof queryKeys.expenses.byBuilding>>[],
  });
}

export function useExpenses(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.expenses.detail(id),
      queryFn: () => getExpense(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<Expense | null, Error, Expense | null, ReturnType<typeof queryKeys.expenses.detail>>[],
  });
}
