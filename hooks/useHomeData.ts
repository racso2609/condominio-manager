"use client";

import { useMemo } from "react";
import {
  useUserCondominiums,
  usePendingInvitesByEmail,
} from "@/lib/queries/useCondominium";
import { useAnnouncementsByCondominiums } from "@/lib/queries/useAnnouncement";
import { useComplaintsByCondominiums } from "@/lib/queries/useComplaint";
import { useUnitsByOwner } from "@/lib/queries/useUnit";
import { useBuildings } from "@/lib/queries/useBuilding";
import { useEntriesByUnits } from "@/lib/queries/useExpenseEntry";
import {
  useExpensesByCondominiums,
  useExpensesByBuildings,
} from "@/lib/queries/useExpense";
import { useUsers } from "@/lib/queries/useUser";
import {
  AppUser,
  Announcement,
  Building,
  Complaint,
  Condominium,
  CondominiumRole,
  Expense,
  ExpenseEntry,
  Unit,
} from "@/lib/types";

interface UseHomeDataResult {
  condominiums: Condominium[];
  pendingInvites: CondominiumRole[];
  announcements: Announcement[];
  announcementAuthors: Record<string, AppUser>;
  complaints: Complaint[];
  complaintAuthors: Record<string, AppUser>;
  condominiumNames: Record<string, string>;
  paymentEntries: ExpenseEntry[];
  paymentUnits: Record<string, Unit>;
  paymentBuildings: Record<string, Building>;
  paymentExpenses: Record<string, Expense>;
  loading: boolean;
}

export function useHomeData(appUser: AppUser | undefined): UseHomeDataResult {
  const { data: condominiums = [], isLoading: condominiumsLoading } =
    useUserCondominiums(appUser?.id, appUser?.role);

  const { data: pendingInvites = [], isLoading: invitesLoading } =
    usePendingInvitesByEmail(appUser?.email);

  const { data: userUnits = [], isLoading: unitsLoading } = useUnitsByOwner(
    appUser?.id
  );

  const condominiumIds = useMemo(
    () => condominiums.map((c) => c.id),
    [condominiums]
  );

  const announcementsQueries =
    useAnnouncementsByCondominiums(condominiumIds);
  const complaintsQueries = useComplaintsByCondominiums(condominiumIds);

  const buildingIds = useMemo(
    () => Array.from(new Set(userUnits.map((u) => u.building))),
    [userUnits]
  );

  const buildingsQueries = useBuildings(buildingIds);

  const buildingMap = useMemo(() => {
    const map: Record<string, Building> = {};
    buildingsQueries.forEach((q) => {
      if (q.data) map[q.data.id] = q.data;
    });
    return map;
  }, [buildingsQueries]);

  const ownedUnitsInCondos = useMemo(() => {
    return userUnits.filter((u) => {
      const b = buildingMap[u.building];
      return b && condominiumIds.includes(b.condominium);
    });
  }, [userUnits, buildingMap, condominiumIds]);

  const ownedUnitIds = useMemo(
    () => ownedUnitsInCondos.map((u) => u.id),
    [ownedUnitsInCondos]
  );

  const unitMap = useMemo(() => {
    const map: Record<string, Unit> = {};
    ownedUnitsInCondos.forEach((u) => {
      map[u.id] = u;
    });
    return map;
  }, [ownedUnitsInCondos]);

  const { data: paymentEntries = [], isLoading: entriesLoading } =
    useEntriesByUnits(ownedUnitIds);

  const expensesByCondominiumQueries =
    useExpensesByCondominiums(condominiumIds);
  const expensesByBuildingQueries = useExpensesByBuildings(buildingIds);

  const allAnnouncements = useMemo(() => {
    const items: Announcement[] = [];
    announcementsQueries.forEach((q) => {
      if (q.data) items.push(...q.data);
    });
    return items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [announcementsQueries]);

  const allComplaints = useMemo(() => {
    const items: Complaint[] = [];
    complaintsQueries.forEach((q) => {
      if (q.data) items.push(...q.data);
    });
    return items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [complaintsQueries]);

  const expenseMap = useMemo(() => {
    const map: Record<string, Expense> = {};
    expensesByCondominiumQueries.forEach((q) => {
      if (q.data) q.data.forEach((e) => (map[e.id] = e));
    });
    expensesByBuildingQueries.forEach((q) => {
      if (q.data) q.data.forEach((e) => (map[e.id] = e));
    });
    return map;
  }, [expensesByCondominiumQueries, expensesByBuildingQueries]);

  const authorIds = useMemo(() => {
    const ids = new Set<string>();
    allAnnouncements.forEach((a) => ids.add(a.author));
    allComplaints.forEach((c) => ids.add(c.author));
    return Array.from(ids);
  }, [allAnnouncements, allComplaints]);

  const usersQueries = useUsers(authorIds);

  const authorMap = useMemo(() => {
    const map: Record<string, AppUser> = {};
    usersQueries.forEach((q) => {
      if (q.data) map[q.data.id] = q.data;
    });
    return map;
  }, [usersQueries]);

  const condominiumNames = useMemo(() => {
    const names: Record<string, string> = {};
    condominiums.forEach((c) => {
      names[c.id] = c.name;
    });
    return names;
  }, [condominiums]);

  const loading =
    condominiumsLoading ||
    invitesLoading ||
    unitsLoading ||
    entriesLoading ||
    announcementsQueries.some((q) => q.isLoading) ||
    complaintsQueries.some((q) => q.isLoading) ||
    buildingsQueries.some((q) => q.isLoading) ||
    expensesByCondominiumQueries.some((q) => q.isLoading) ||
    expensesByBuildingQueries.some((q) => q.isLoading) ||
    usersQueries.some((q) => q.isLoading);

  return {
    condominiums,
    pendingInvites,
    announcements: allAnnouncements,
    announcementAuthors: authorMap,
    complaints: allComplaints,
    complaintAuthors: authorMap,
    condominiumNames,
    paymentEntries,
    paymentUnits: unitMap,
    paymentBuildings: buildingMap,
    paymentExpenses: expenseMap,
    loading,
  };
}
