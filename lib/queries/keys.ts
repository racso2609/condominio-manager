export const queryKeys = {
  condominiums: {
    all: () => ["condominiums"] as const,
    byUser: (userId: string, role: string) =>
      ["condominiums", "user", userId, role] as const,
    detail: (id: string) => ["condominiums", id] as const,
    roles: (condominiumId: string) =>
      ["condominiums", condominiumId, "roles"] as const,
    userRole: (condominiumId: string, userId: string) =>
      ["condominiums", condominiumId, "roles", "user", userId] as const,
    membership: (condominiumId: string, userId: string, globalRole: string) =>
      [
        "condominiums",
        condominiumId,
        "membership",
        userId,
        globalRole,
      ] as const,
    pendingRoles: (condominiumId: string) =>
      ["condominiums", condominiumId, "roles", "pending"] as const,
    managedBuildings: (condominiumId: string, userId: string) =>
      [
        "condominiums",
        condominiumId,
        "managedBuildings",
        userId,
      ] as const,
    buildingManagers: (condominiumId: string) =>
      ["condominiums", condominiumId, "buildingManagers"] as const,
    pendingInvites: (email: string) =>
      ["condominiums", "invites", email] as const,
    inviteByToken: (token: string) =>
      ["condominiums", "invites", "token", token] as const,
  },
  buildings: {
    all: () => ["buildings"] as const,
    byCondominium: (condominiumId: string) =>
      ["buildings", "condominium", condominiumId] as const,
    detail: (id: string) => ["buildings", id] as const,
  },
  units: {
    all: () => ["units"] as const,
    byBuilding: (buildingId: string) =>
      ["units", "building", buildingId] as const,
    byOwner: (userId: string) => ["units", "owner", userId] as const,
    byOwnerStatus: (status: "pending" | "verified") =>
      ["units", "owner_status", status] as const,
    pendingByBuilding: (buildingId: string) =>
      ["units", "building", buildingId, "pending"] as const,
    detail: (id: string) => ["units", id] as const,
  },
  expenses: {
    all: () => ["expenses"] as const,
    byCondominium: (condominiumId: string) =>
      ["expenses", "condominium", condominiumId] as const,
    byBuilding: (buildingId: string) =>
      ["expenses", "building", buildingId] as const,
    detail: (id: string) => ["expenses", id] as const,
  },
  expenseEntries: {
    all: () => ["expenseEntries"] as const,
    byExpense: (expenseId: string) =>
      ["expenseEntries", "expense", expenseId] as const,
    byExpenseAndBuilding: (
      expenseId: string,
      buildingId: string,
      page: number,
      search?: string
    ) =>
      [
        "expenseEntries",
        "expense",
        expenseId,
        "building",
        buildingId,
        page,
        search ?? "",
      ] as const,
    byUnit: (unitId: string) => ["expenseEntries", "unit", unitId] as const,
    byUnits: (unitIds: string[]) =>
      ["expenseEntries", "units", unitIds.sort().join(",")] as const,
    detail: (id: string) => ["expenseEntries", id] as const,
  },
  announcements: {
    all: () => ["announcements"] as const,
    byCondominium: (condominiumId: string) =>
      ["announcements", "condominium", condominiumId] as const,
    detail: (id: string) => ["announcements", id] as const,
  },
  complaints: {
    all: () => ["complaints"] as const,
    byCondominium: (condominiumId: string) =>
      ["complaints", "condominium", condominiumId] as const,
    byAuthor: (condominiumId: string, authorId: string) =>
      ["complaints", "condominium", condominiumId, "author", authorId] as const,
    detail: (id: string) => ["complaints", id] as const,
  },
  users: {
    all: () => ["users"] as const,
    detail: (id: string) => ["users", id] as const,
    byEmail: (email: string) => ["users", "email", email] as const,
  },
  paymentMethods: {
    all: () => ["paymentMethods"] as const,
    byCondominium: (condominiumId: string) =>
      ["paymentMethods", "condominium", condominiumId] as const,
    detail: (id: string) => ["paymentMethods", id] as const,
  },
} as const;
