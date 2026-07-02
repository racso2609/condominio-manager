"use client";

import { useEffect, useState } from "react";
import {
  getUserCondominiums,
  getPendingInvitesByEmail,
  getCondominium,
} from "@/lib/services/condominiumService";
import { getAnnouncementsByCondominium } from "@/lib/services/announcementService";
import { getComplaintsByCondominium } from "@/lib/services/complaintService";
import { getUser } from "@/lib/services/userService";
import { getUnitsByOwner } from "@/lib/services/unitService";
import { getBuilding } from "@/lib/services/buildingService";
import {
  getExpensesByCondominium,
  getExpensesByBuilding,
} from "@/lib/services/expenseService";
import { getEntriesByUnits } from "@/lib/services/expenseEntryService";
import {
  Condominium,
  CondominiumRole,
  Announcement,
  AppUser,
  ExpenseEntry,
  Unit,
  Building,
  Expense,
  Complaint,
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
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [pendingInvites, setPendingInvites] = useState<CondominiumRole[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementAuthors, setAnnouncementAuthors] = useState<
    Record<string, AppUser>
  >({});
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintAuthors, setComplaintAuthors] = useState<
    Record<string, AppUser>
  >({});
  const [condominiumNames, setCondominiumNames] = useState<
    Record<string, string>
  >({});
  const [paymentEntries, setPaymentEntries] = useState<ExpenseEntry[]>([]);
  const [paymentUnits, setPaymentUnits] = useState<Record<string, Unit>>({});
  const [paymentBuildings, setPaymentBuildings] = useState<
    Record<string, Building>
  >({});
  const [paymentExpenses, setPaymentExpenses] = useState<
    Record<string, Expense>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser) return;

    Promise.all([
      getUserCondominiums(appUser.id, appUser.role),
      getPendingInvitesByEmail(appUser.email),
    ]).then(async ([list, invites]) => {
      setCondominiums(list);
      setPendingInvites(invites);

      const condoIds = list.map((c) => c.id);

      const [allAnnouncements, allComplaints, userUnits] = await Promise.all([
        (async () => {
          const anns: Announcement[] = [];
          for (const c of list) {
            const condoAnns = await getAnnouncementsByCondominium(c.id);
            anns.push(...condoAnns);
          }
          anns.sort(
            (a, b) => b.created_at.toMillis() - a.created_at.toMillis()
          );
          return anns;
        })(),
        (async () => {
          const comps: Complaint[] = [];
          for (const c of list) {
            const condoComps = await getComplaintsByCondominium(c.id);
            comps.push(...condoComps);
          }
          return comps;
        })(),
        getUnitsByOwner(appUser.id),
      ]);
      setAnnouncements(allAnnouncements);

      const visibleComplaints =
        appUser.role === "admin"
          ? allComplaints
          : allComplaints.filter((c) => c.author === appUser.id);
      visibleComplaints.sort(
        (a, b) => b.created_at.toMillis() - a.created_at.toMillis()
      );
      setComplaints(visibleComplaints);

      const authorIds = new Set<string>();
      const announcementCondoIds = new Set<string>();
      allAnnouncements.forEach((a) => {
        authorIds.add(a.author);
        announcementCondoIds.add(a.condominium);
      });
      visibleComplaints.forEach((c) => {
        authorIds.add(c.author);
      });

      const buildingIds = new Set(userUnits.map((u) => u.building));
      const buildingMap: Record<string, Building> = {};
      for (const bid of buildingIds) {
        const b = await getBuilding(bid);
        if (b) buildingMap[bid] = b;
      }
      setPaymentBuildings(buildingMap);

      const ownedUnitsInCondos = userUnits.filter((u) => {
        const b = buildingMap[u.building];
        return b && condoIds.includes(b.condominium);
      });

      const unitMap: Record<string, Unit> = {};
      ownedUnitsInCondos.forEach((u) => {
        unitMap[u.id] = u;
      });
      setPaymentUnits(unitMap);

      if (ownedUnitsInCondos.length > 0) {
        const ownedUnitIds = ownedUnitsInCondos.map((u) => u.id);
        const entries = await getEntriesByUnits(ownedUnitIds);
        setPaymentEntries(entries);

        const expenseMap: Record<string, Expense> = {};
        for (const c of list) {
          const exps = await getExpensesByCondominium(c.id);
          for (const e of exps) expenseMap[e.id] = e;
        }
        for (const bid of buildingIds) {
          const exps = await getExpensesByBuilding(bid);
          for (const e of exps) expenseMap[e.id] = e;
        }
        setPaymentExpenses(expenseMap);
      }

      const names: Record<string, string> = {};
      for (const cid of condoIds) {
        const c = list.find((c) => c.id === cid);
        if (c) names[cid] = c.name;
        else {
          const fetched = await getCondominium(cid);
          if (fetched) names[cid] = fetched.name;
        }
      }
      for (const cid of announcementCondoIds) {
        if (names[cid]) continue;
        const fetched = await getCondominium(cid);
        if (fetched) names[cid] = fetched.name;
      }
      setCondominiumNames(names);

      const map: Record<string, AppUser> = {};
      for (const uid of authorIds) {
        const u = await getUser(uid);
        if (u) map[uid] = u;
      }
      setAnnouncementAuthors(map);
      setComplaintAuthors(map);
      setLoading(false);
    });
  }, [appUser]);

  return {
    condominiums,
    pendingInvites,
    announcements,
    announcementAuthors,
    complaints,
    complaintAuthors,
    condominiumNames,
    paymentEntries,
    paymentUnits,
    paymentBuildings,
    paymentExpenses,
    loading,
  };
}
