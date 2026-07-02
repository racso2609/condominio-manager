import {
  useQuery,
  useQueries,
  UseQueryOptions,
  skipToken,
} from "@tanstack/react-query";
import {
  getAnnouncement,
  getAnnouncementsByCondominium,
} from "@/lib/services/announcementService";
import { Announcement } from "@/lib/types";
import { queryKeys } from "./keys";

export function useAnnouncement(id?: string) {
  return useQuery({
    queryKey: queryKeys.announcements.detail(id ?? ""),
    queryFn: id ? () => getAnnouncement(id) : skipToken,
    enabled: Boolean(id),
  });
}

export function useAnnouncementsByCondominium(condominiumId?: string) {
  return useQuery({
    queryKey: queryKeys.announcements.byCondominium(condominiumId ?? ""),
    queryFn: condominiumId
      ? () => getAnnouncementsByCondominium(condominiumId)
      : skipToken,
    enabled: Boolean(condominiumId),
  });
}

export function useAnnouncementsByCondominiums(condominiumIds: string[]) {
  return useQueries({
    queries: condominiumIds.map((id) => ({
      queryKey: queryKeys.announcements.byCondominium(id),
      queryFn: () => getAnnouncementsByCondominium(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<Announcement[], Error, Announcement[], ReturnType<typeof queryKeys.announcements.byCondominium>>[],
  });
}
