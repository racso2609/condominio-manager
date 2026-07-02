import {
  useQuery,
  useQueries,
  UseQueryOptions,
  skipToken,
} from "@tanstack/react-query";
import {
  getPaymentMethod,
  getPaymentMethodsByCondominium,
} from "@/lib/services/paymentMethodService";
import { PaymentMethod } from "@/lib/types";
import { queryKeys } from "./keys";

export function usePaymentMethod(id?: string) {
  return useQuery({
    queryKey: queryKeys.paymentMethods.detail(id ?? ""),
    queryFn: id ? () => getPaymentMethod(id) : skipToken,
    enabled: Boolean(id),
  });
}

export function usePaymentMethodsByCondominium(condominiumId?: string) {
  return useQuery({
    queryKey: queryKeys.paymentMethods.byCondominium(condominiumId ?? ""),
    queryFn: condominiumId
      ? () => getPaymentMethodsByCondominium(condominiumId)
      : skipToken,
    enabled: Boolean(condominiumId),
  });
}

export function usePaymentMethods(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.paymentMethods.detail(id),
      queryFn: () => getPaymentMethod(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<PaymentMethod | null, Error, PaymentMethod | null, ReturnType<typeof queryKeys.paymentMethods.detail>>[],
  });
}
