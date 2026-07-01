"use client";

import { useAuthContext } from "@/context/authContext";
import { useHomeData } from "@/hooks/useHomeData";
import {
  AccountSection,
  HomeSkeleton,
  InvitesSection,
  PaymentsSection,
  AnnouncementsSection,
  CondominiumsSection,
} from "@/components/home";

export default function Home() {
  const { user, appUser, logout } = useAuthContext();
  const {
    condominiums,
    pendingInvites,
    announcements,
    announcementAuthors,
    condominiumNames,
    paymentEntries,
    paymentUnits,
    paymentBuildings,
    paymentExpenses,
    loading,
  } = useHomeData(appUser);

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-8">
      <AccountSection
        user={user}
        appUser={appUser}
        logout={logout ?? (() => {})}
      />

      <InvitesSection pendingInvites={pendingInvites} />

      <AnnouncementsSection
        announcements={announcements}
        announcementAuthors={announcementAuthors}
      />

      <CondominiumsSection
        condominiums={condominiums}
        loading={loading}
        appUser={appUser}
      />

      <PaymentsSection
        paymentEntries={paymentEntries}
        paymentUnits={paymentUnits}
        paymentBuildings={paymentBuildings}
        paymentExpenses={paymentExpenses}
        condominiumNames={condominiumNames}
      />
    </div>
  );
}
