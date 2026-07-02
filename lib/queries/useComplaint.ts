import {
  useQuery,
  useQueries,
  UseQueryOptions,
  skipToken,
} from "@tanstack/react-query";
import {
  getComplaint,
  getComplaintsByCondominium,
  getComplaintsByAuthor,
} from "@/lib/services/complaintService";
import { Complaint } from "@/lib/types";
import { queryKeys } from "./keys";

export function useComplaint(id?: string) {
  return useQuery({
    queryKey: queryKeys.complaints.detail(id ?? ""),
    queryFn: id ? () => getComplaint(id) : skipToken,
    enabled: Boolean(id),
  });
}

export function useComplaintsByCondominium(condominiumId?: string) {
  return useQuery({
    queryKey: queryKeys.complaints.byCondominium(condominiumId ?? ""),
    queryFn: condominiumId
      ? () => getComplaintsByCondominium(condominiumId)
      : skipToken,
    enabled: Boolean(condominiumId),
  });
}

export function useComplaintsByAuthor(
  condominiumId?: string,
  authorId?: string
) {
  return useQuery({
    queryKey: queryKeys.complaints.byAuthor(
      condominiumId ?? "",
      authorId ?? ""
    ),
    queryFn:
      condominiumId && authorId
        ? () => getComplaintsByAuthor(condominiumId, authorId)
        : skipToken,
    enabled: Boolean(condominiumId && authorId),
  });
}

export function useComplaintsByCondominiums(condominiumIds: string[]) {
  return useQueries({
    queries: condominiumIds.map((id) => ({
      queryKey: queryKeys.complaints.byCondominium(id),
      queryFn: () => getComplaintsByCondominium(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<Complaint[], Error, Complaint[], ReturnType<typeof queryKeys.complaints.byCondominium>>[],
  });
}
