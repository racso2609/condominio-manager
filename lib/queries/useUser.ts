import {
  useQuery,
  useQueries,
  UseQueryOptions,
  skipToken,
} from "@tanstack/react-query";
import { getUser, getUserByEmail } from "@/lib/services/userService";
import { AppUser } from "@/lib/types";
import { queryKeys } from "./keys";

export function useUser(id?: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id ?? ""),
    queryFn: id ? () => getUser(id) : skipToken,
    enabled: Boolean(id),
  });
}

export function useUsers(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.users.detail(id),
      queryFn: () => getUser(id),
      enabled: Boolean(id),
    })) satisfies UseQueryOptions<AppUser | null, Error, AppUser | null, ReturnType<typeof queryKeys.users.detail>>[],
  });
}

export function useUserByEmail(email?: string) {
  return useQuery({
    queryKey: queryKeys.users.byEmail(email ?? ""),
    queryFn: email ? () => getUserByEmail(email) : skipToken,
    enabled: Boolean(email),
  });
}
