"use client";

import { useMemo, useState } from "react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader } from "@/components/PageHeader";
import { useCondominiumPage } from "@/hooks/useCondominiumPage";
import {
  useCondominiumRoles,
  useBuildingManagers,
} from "@/lib/queries/useCondominium";
import { useBuildingsByCondominium } from "@/lib/queries/useBuilding";
import { useUnitsByBuildings } from "@/lib/queries/useUnit";
import { useUsers } from "@/lib/queries/useUser";
import {
  useExpensesByCondominium,
  useExpensesByBuildings,
} from "@/lib/queries/useExpense";
import { useEntriesByExpenses } from "@/lib/queries/useExpenseEntry";
import { isExpenseCancelled } from "@/lib/utils/expense";
import { usePaymentMethodsByCondominium } from "@/lib/queries/usePaymentMethod";
import {
  useRejectUnitClaim,
  useRemoveUnitOwner,
  useVerifyUnitOwner,
  useAssignUnitOwner,
} from "@/lib/mutations/useUnitMutations";
import {
  useVerifyRole,
  useDeleteCondominiumRole,
  useAddBuildingManagerAssignment,
  useRemoveBuildingManagerAssignment,
  usePromoteToBuildingManager,
  useDemoteToResident,
} from "@/lib/mutations/useCondominiumMutations";
import { useMarkEntryAsPaid } from "@/lib/mutations/useExpenseEntryMutations";
import {
  CondominiumRole,
  Unit,
  Building,
  ExpenseEntry,
  AppUser,
  rankCondominiumRole,
} from "@/lib/types";
import { PaymentMethodCard } from "@/components/PaymentMethodCard";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import Collapse from "@/components/Collapse";
import PaymentOrderItem from "@/components/PaymentOrderItem";
import { ResidentsSkeleton } from "@/components/skeleton";
import { PermissionDenied } from "@/components/PermissionDenied";
import { FormField, Select } from "@/components/Form";
import { EditResidentContactModal } from "@/components/EditResidentContactModal";
import {
  buildResidentAccountSummaryText,
  buildWhatsAppLink,
} from "@/lib/utils/whatsapp";

const EMPTY_BUILDINGS: Building[] = [];
const EMPTY_MANAGERS: { role: CondominiumRole; buildings: string[] }[] = [];

export default function ResidentsPage() {
  const {
    appUser,
    condominiumId,
    condominium,
    condominiumLoading,
    isAdminOrManager,
    isCondoAdmin,
    managedBuildingIds,
  } = useCondominiumPage();
  const { data: roles = [], isLoading: rolesLoading } =
    useCondominiumRoles(condominiumId);
  const { data: allBuildingsData, isLoading: buildingsLoading } =
    useBuildingsByCondominium(condominiumId);
  const allBuildings = allBuildingsData ?? EMPTY_BUILDINGS;
  const { data: paymentMethods = [], isLoading: methodsLoading } =
    usePaymentMethodsByCondominium(condominiumId);
  const { data: buildingManagersData, isLoading: managersLoading } =
    useBuildingManagers(condominiumId);
  const buildingManagers = buildingManagersData ?? EMPTY_MANAGERS;

  const buildings = isCondoAdmin
    ? allBuildings
    : allBuildings.filter((b) => managedBuildingIds.includes(b.id));

  const buildingIds = buildings.map((b) => b.id);
  const unitsQueries = useUnitsByBuildings(buildingIds);

  const allUnits = useMemo(() => {
    return unitsQueries.flatMap((q) => q.data ?? []);
  }, [unitsQueries]);

  const pendingUnits = useMemo(
    () => allUnits.filter((u) => u.owner_status === "pending"),
    [allUnits]
  );

  const unitsByOwner = useMemo(() => {
    const map: Record<string, Unit[]> = {};
    allUnits.forEach((u) => {
      if (u.owner) {
        if (!map[u.owner]) map[u.owner] = [];
        map[u.owner].push(u);
      }
    });
    return map;
  }, [allUnits]);

  const ownerIds = useMemo(() => {
    const ids = new Set<string>();
    allUnits.forEach((u) => {
      if (u.owner) ids.add(u.owner);
    });
    roles.forEach((r) => {
      if (r.role === "resident" && r.user) ids.add(r.user);
    });
    buildingManagers.forEach((m) => {
      if (m.role.user) ids.add(m.role.user);
    });
    return Array.from(ids);
  }, [allUnits, roles, buildingManagers]);

  const ownersQueries = useUsers(ownerIds);

  const owners = useMemo(() => {
    const map: Record<string, import("@/lib/types").AppUser> = {};
    ownersQueries.forEach((q) => {
      if (q.data) map[q.data.id] = q.data;
    });
    return map;
  }, [ownersQueries]);

  const { data: condoExpenses = [], isLoading: condoExpensesLoading } =
    useExpensesByCondominium(condominiumId);
  const buildingExpensesQueries = useExpensesByBuildings(buildingIds);

  const expenses = useMemo(() => {
    const map: Record<string, import("@/lib/types").Expense> = {};
    condoExpenses.forEach((e) => (map[e.id] = e));
    buildingExpensesQueries.forEach((q) => {
      if (q.data) q.data.forEach((e) => (map[e.id] = e));
    });
    return map;
  }, [condoExpenses, buildingExpensesQueries]);

  const expenseIds = useMemo(() => Object.keys(expenses), [expenses]);
  const entriesQueries = useEntriesByExpenses(expenseIds);

  const entriesByUnit = useMemo(() => {
    const map: Record<string, ExpenseEntry[]> = {};
    entriesQueries.forEach((q) => {
      if (q.data) {
        q.data.forEach((entry) => {
          if (!map[entry.unit]) map[entry.unit] = [];
          map[entry.unit].push(entry);
        });
      }
    });
    return map;
  }, [entriesQueries]);

  const [assigningForRole, setAssigningForRole] = useState<string | null>(null);
  const [assignBuildingId, setAssignBuildingId] = useState("");
  const [assignUnitId, setAssignUnitId] = useState("");
  const [removingUnitId, setRemovingUnitId] = useState<string | null>(null);
  const [editingResident, setEditingResident] = useState<AppUser | null>(null);
  const [copiedResidentId, setCopiedResidentId] = useState<string | null>(null);

  const handleCopySummary = (roleId: string, summaryText: string) => {
    navigator.clipboard.writeText(summaryText);
    setCopiedResidentId(roleId);
    setTimeout(() => setCopiedResidentId(null), 2500);
  };

  const { mutate: rejectUnitClaim, isPending: rejecting } = useRejectUnitClaim();
  const { mutate: removeUnitOwner, isPending: removing } = useRemoveUnitOwner();
  const { mutate: verifyUnitOwner, isPending: verifyingUnit } =
    useVerifyUnitOwner();
  const { mutate: assignUnitOwner, isPending: assigning } = useAssignUnitOwner();
  const { mutate: verifyRole } = useVerifyRole();
  const { mutate: deleteCondominiumRole } = useDeleteCondominiumRole();
  const { mutate: markEntryAsPaid, isPending: validatingPayment } =
    useMarkEntryAsPaid();
  const { mutate: addManagerAssignment } = useAddBuildingManagerAssignment();
  const { mutate: removeManagerAssignment } =
    useRemoveBuildingManagerAssignment();
  const { mutate: promoteToManager, isPending: promoting } =
    usePromoteToBuildingManager();
  const { mutate: demoteToResident } = useDemoteToResident();
  const [addingTowerForRole, setAddingTowerForRole] = useState<string | null>(
    null
  );
  const [newTowerId, setNewTowerId] = useState("");
  const [promotingRoleId, setPromotingRoleId] = useState<string | null>(null);
  const [promoteTowerIds, setPromoteTowerIds] = useState<string[]>([]);

  const togglePromoteTower = (buildingId: string) => {
    setPromoteTowerIds((prev) =>
      prev.includes(buildingId)
        ? prev.filter((id) => id !== buildingId)
        : [...prev, buildingId]
    );
  };

  const handleStartPromote = (roleId: string) => {
    setPromotingRoleId(roleId);
    setPromoteTowerIds([]);
  };

  const handlePromote = (roleId: string) => {
    if (promoteTowerIds.length === 0) {
      alert("Selecciona al menos una torre.");
      return;
    }
    promoteToManager(
      { roleId, condominiumId, buildings: promoteTowerIds },
      {
        onSuccess: () => {
          setPromotingRoleId(null);
          setPromoteTowerIds([]);
        },
        onError: (e) =>
          alert(e instanceof Error ? e.message : "Error al promover"),
      }
    );
  };

  const handleDemote = (roleId: string, name: string) => {
    if (
      !window.confirm(
        `¿Quitar el rol de encargado a ${name}? Volverá a ser residente.`
      )
    )
      return;
    demoteToResident(
      { roleId, condominiumId },
      { onError: () => alert("Error al quitar el rol de encargado") }
    );
  };

  const handleReject = (unitId: string) => {
    if (
      !window.confirm(
        "¿Rechazar esta solicitud? El usuario no podrá reclamar esta unidad por 1 semana."
      )
    )
      return;

    rejectUnitClaim(unitId);
  };

  const handleRemoveOwner = (
    unitId: string,
    ownerId: string,
    roleId: string
  ) => {
    const isSelf = ownerId === appUser?.id;
    const action = isSelf ? "renunciar" : "revocar";
    if (
      !window.confirm(
        `¿${isSelf ? "Renunciar" : "Revocar"} la propiedad de esta unidad?`
      )
    )
      return;

    setRemovingUnitId(unitId);
    removeUnitOwner(unitId, {
      onSuccess: () => {
        const remainingCount = (unitsByOwner[ownerId] ?? []).filter(
          (u) => u.id !== unitId
        ).length;
        const removedRole = roles.find((r) => r.id === roleId);
        if (remainingCount === 0 && removedRole?.role === "resident") {
          deleteCondominiumRole(roleId);
        }
        setRemovingUnitId(null);
      },
      onError: () => {
        alert(`Error al ${action} la propiedad`);
        setRemovingUnitId(null);
      },
    });
  };

  const handleVerify = (unitId: string, roleId: string) => {
    verifyUnitOwner(unitId, {
      onSuccess: () => verifyRole(roleId),
    });
  };

  const handleAssignUnit = (residentId: string) => {
    if (!assignUnitId) return;

    assignUnitOwner(
      { unitId: assignUnitId, userId: residentId },
      {
        onSuccess: () => {
          setAssigningForRole(null);
          setAssignBuildingId("");
          setAssignUnitId("");
        },
        onError: () => alert("Error al asignar la unidad"),
      }
    );
  };

  const handleValidatePayment = (entryId: string, note: string) => {
    if (!appUser) return;

    markEntryAsPaid({
      id: entryId,
      data: { notes: note, validated_by: appUser.id },
    });
  };

  const handleAddTower = (roleId: string) => {
    if (!newTowerId) return;
    addManagerAssignment(
      { roleId, building: newTowerId, condominiumId },
      {
        onSuccess: () => {
          setAddingTowerForRole(null);
          setNewTowerId("");
        },
        onError: () => alert("Error al asignar la torre"),
      }
    );
  };

  const handleRemoveTower = (roleId: string, buildingId: string) => {
    const building = buildingsMap[buildingId];
    if (
      !window.confirm(
        `¿Quitar ${building?.name ?? "esta torre"} de este encargado?`
      )
    )
      return;
    removeManagerAssignment(
      { roleId, building: buildingId, condominiumId },
      { onError: () => alert("Error al quitar la torre") }
    );
  };

  const getPendingEntriesForOwner = (ownerId: string): ExpenseEntry[] => {
    const units = unitsByOwner[ownerId] ?? [];
    const entries: ExpenseEntry[] = [];
    for (const u of units) {
      const unitEntries = entriesByUnit[u.id] ?? [];
      entries.push(
        ...unitEntries.filter(
          (e) => e.status !== "paid" && !isExpenseCancelled(expenses[e.expense])
        )
      );
    }
    return entries;
  };

  const getTotalPendingForOwner = (ownerId: string): number => {
    return getPendingEntriesForOwner(ownerId).reduce((s, e) => s + e.amount, 0);
  };

  const residentRoles = Object.values(
    roles
      .filter((r) => {
        if (isCondoAdmin) return true;
        return (unitsByOwner[r.user]?.length ?? 0) > 0;
      })
      .reduce<Record<string, CondominiumRole>>((acc, r) => {
        const existing = acc[r.user];
        if (!existing || rankCondominiumRole(r) > rankCondominiumRole(existing)) {
          acc[r.user] = r;
        }
        return acc;
      }, {})
  );

  const buildingsMap: Record<string, Building> = {};
  buildings.forEach((b) => {
    buildingsMap[b.id] = b;
  });

  const loading =
    condominiumLoading ||
    rolesLoading ||
    buildingsLoading ||
    methodsLoading ||
    managersLoading ||
    condoExpensesLoading ||
    unitsQueries.some((q) => q.isLoading) ||
    ownersQueries.some((q) => q.isLoading) ||
    buildingExpensesQueries.some((q) => q.isLoading) ||
    entriesQueries.some((q) => q.isLoading);

  if (loading) {
    return <ResidentsSkeleton />;
  }

  if (!condominium) return null;

  if (!isAdminOrManager) {
    return (
      <PermissionDenied message="No tienes permisos para gestionar residentes." />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: condominium.name, href: `/condominium/${condominium.id}` },
          { label: "Residentes" },
        ]}
      />

      <PageHeader title="Gestionar residentes" subtitle={condominium.name} />

      {pendingUnits.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Solicitudes pendientes ({pendingUnits.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pendingUnits.map((u) => {
              const owner = u.owner ? owners[u.owner] : undefined;
              const building = buildingsMap[u.building];
              const role = roles.find((r) => r.user === u.owner);
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900 dark:bg-amber-900/20"
                >
                  {owner?.photoURL ? (
                    <img
                      src={owner.photoURL}
                      alt={owner.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-200 text-sm font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-400">
                      {(owner?.name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {owner?.name ?? "Usuario desconocido"}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {owner?.email ?? ""}
                      {owner?.phone && (
                        <span className="ml-1">· {owner.phone}</span>
                      )}
                      {building && (
                        <span className="ml-1">
                          · {building.name} / Unidad {u.num}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {role && (
                      <Button
                        onClick={() => handleVerify(u.id, role.id)}
                        disabled={verifyingUnit}
                        variant="emerald"
                        size="md"
                      >
                        {verifyingUnit ? "Validando..." : "Validar"}
                      </Button>
                    )}
                    <Button
                      onClick={() => handleReject(u.id)}
                      disabled={rejecting}
                      variant="danger"
                      size="md"
                    >
                      {rejecting ? "..." : "Rechazar"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pendingUnits.length === 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-zinc-500 dark:text-zinc-400">
            No hay solicitudes pendientes.
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Residentes y propietarios ({residentRoles.length})
        </h2>
        <div className="flex flex-col gap-2">
          {residentRoles.map((r) => {
            const owner = owners[r.user] ?? null;
            const units = unitsByOwner[r.user] ?? [];
            const pendingEntries = getPendingEntriesForOwner(r.user);
            const totalPending = getTotalPendingForOwner(r.user);

            const subtitleItems: string[] = [];
            if (owner?.email) subtitleItems.push(owner.email);
            if (owner?.phone) subtitleItems.push(owner.phone);
            if (owner?.document_id) subtitleItems.push(`ID: ${owner.document_id}`);
            const subtitleText =
              subtitleItems.length > 0
                ? subtitleItems.join(" · ")
                : r.invited_email ?? "";

            const unitsText = units
              .map(
                (u) => `${buildingsMap[u.building]?.name ?? ""} / ${u.num}`
              )
              .join(", ");

            const summaryText = buildResidentAccountSummaryText({
              condominiumName: condominium.name,
              residentName: owner?.name ?? r.invited_email ?? "Residente",
              unitsText: unitsText || "Sin unidad asignada",
              pendingEntries,
              expenses,
              paymentMethods,
            });

            const whatsappUrl = buildWhatsAppLink(owner?.phone, summaryText);

            return (
              <Collapse
                key={r.id}
                title={owner?.name ?? r.invited_email ?? "Pendiente"}
                subtitle={subtitleText}
                badge={
                  <div className="flex items-center gap-2">
                    {owner?.is_preregistered && (
                      <Badge color="zinc">Offline</Badge>
                    )}
                    {totalPending > 0 && (
                      <Badge color="amber">${totalPending.toFixed(2)} pendiente</Badge>
                    )}
                    <Badge
                      color={r.status === "verified" ? "emerald" : "amber"}
                      uppercase
                    >
                      {r.status === "verified" ? "Verificado" : "Pendiente"}
                    </Badge>
                  </div>
                }
              >
                <div className="flex flex-col gap-4">
                  {/* Actions & WhatsApp Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                    <div className="flex flex-wrap items-center gap-2">
                      {whatsappUrl ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                        >
                          <span>💬 Enviar WhatsApp</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-zinc-400">
                          (Sin teléfono para WhatsApp)
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={() => handleCopySummary(r.id, summaryText)}
                      >
                        {copiedResidentId === r.id
                          ? "✓ ¡Copiado!"
                          : "📋 Copiar resumen"}
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isCondoAdmin &&
                        r.role === "resident" &&
                        !!r.user && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            onClick={() => handleStartPromote(r.id)}
                          >
                            🛡️ Hacer encargado
                          </Button>
                        )}
                      {owner && isAdminOrManager && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => setEditingResident(owner)}
                        >
                          ✏️ Editar contacto
                        </Button>
                      )}
                    </div>
                  </div>

                  {promotingRoleId === r.id && (
                    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Torres que administrará {owner?.name ?? ""}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {allBuildings.map((b) => {
                          const active = promoteTowerIds.includes(b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => togglePromoteTower(b.id)}
                              className={
                                active
                                  ? "rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                                  : "rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                              }
                            >
                              {b.name}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handlePromote(r.id)}
                          disabled={promoting || promoteTowerIds.length === 0}
                        >
                          {promoting ? "Guardando..." : "Confirmar encargado"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setPromotingRoleId(null);
                            setPromoteTowerIds([]);
                          }}
                          disabled={promoting}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {owner?.notes && (
                    <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
                      <span className="font-medium">Nota administrativa:</span>{" "}
                      {owner.notes}
                    </div>
                  )}
                {units.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-zinc-400">
                      Sin unidades asignadas
                    </p>
                    {assigningForRole === r.id ? (
                      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
                        <FormField label="Edificio">
                          <Select
                            value={assignBuildingId}
                            onChange={(e) => {
                              setAssignBuildingId(e.target.value);
                              setAssignUnitId("");
                            }}
                          >
                            <option value="">Selecciona un edificio</option>
                            {buildings.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </Select>
                        </FormField>
                        <FormField label="Unidad">
                          <Select
                            value={assignUnitId}
                            onChange={(e) => setAssignUnitId(e.target.value)}
                            disabled={!assignBuildingId}
                          >
                            <option value="">Selecciona una unidad</option>
                            {allUnits
                              .filter(
                                (u) =>
                                  u.building === assignBuildingId && !u.owner
                              )
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.num}
                                </option>
                              ))}
                          </Select>
                        </FormField>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAssignUnit(r.user)}
                            disabled={!assignUnitId || assigning}
                            variant="primary"
                            size="md"
                          >
                            {assigning ? "Asignando..." : "Asignar"}
                          </Button>
                          <Button
                            onClick={() => {
                              setAssigningForRole(null);
                              setAssignBuildingId("");
                              setAssignUnitId("");
                            }}
                            disabled={assigning}
                            variant="secondary"
                            size="md"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setAssigningForRole(r.id)}
                        variant="secondary"
                        size="md"
                      >
                        Asignar unidad
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      {units.map((u) => {
                        const building = buildingsMap[u.building];
                        const canRemove =
                          isAdminOrManager || r.user === appUser?.id;
                        const isSelf = r.user === appUser?.id;
                        return (
                          <div
                            key={u.id}
                            className="flex items-center gap-3 rounded-lg bg-zinc-50 px-4 py-2.5 dark:bg-zinc-900"
                          >
                            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              {building?.name ?? "?"} / {u.num}
                            </span>
                            <Badge
                              color={u.type === "residential" ? "sky" : "amber"}
                              uppercase
                            >
                              {u.type === "residential" ? "Hab." : "Ofi."}
                            </Badge>
                            <Badge
                              color={
                                u.owner_status === "verified" ? "emerald" : "amber"
                              }
                              className="ml-auto"
                            >
                              {u.owner_status === "verified"
                                ? "Verificado"
                                : "Pendiente"}
                            </Badge>
                            {canRemove && (
                              <Button
                                onClick={() =>
                                  handleRemoveOwner(u.id, r.user, r.id)
                                }
                                disabled={removingUnitId === u.id || removing}
                                variant="danger"
                                size="xs"
                              >
                                {removingUnitId === u.id || removing
                                  ? "..."
                                  : isSelf
                                    ? "Renunciar"
                                    : "Revocar"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Pagos pendientes
                      </h4>
                      {pendingEntries.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          No tiene pagos pendientes.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {pendingEntries.map((entry) => {
                            const expense = expenses[entry.expense];
                            const unit = units.find((u) => u.id === entry.unit);
                            return (
                              <PaymentOrderItem
                                key={entry.id}
                                entry={entry}
                                expense={expense}
                                unit={unit}
                                building={
                                  unit ? buildingsMap[unit.building] : undefined
                                }
                                showValidateForm
                                onValidate={(note) =>
                                  handleValidatePayment(entry.id, note)
                                }
                                isValidating={validatingPayment}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Métodos de pago
                      </h4>
                      {paymentMethods.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          No hay métodos de pago configurados.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {paymentMethods.map((method) => (
                            <PaymentMethodCard
                              key={method.id}
                              method={method}
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </div>
              </Collapse>
            );
          })}
        </div>
      </section>

      {isCondoAdmin && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Encargados de torre ({buildingManagers.length})
          </h2>
          {buildingManagers.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
              <p className="text-zinc-500 dark:text-zinc-400">
                No hay encargados de torre. Invita uno desde la página de
                invitaciones.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {buildingManagers.map(({ role: managerRole, buildings: mgrBwd }) => {
                const managerUser = owners[managerRole.user];
                const name =
                  managerUser?.name ??
                  managerRole.invited_email ??
                  "Encargado sin nombre";
                const availableBuildings = allBuildings.filter(
                  (b) => !mgrBwd.includes(b.id)
                );
                return (
                  <div
                    key={managerRole.id}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-black"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {managerUser?.email ?? managerRole.invited_email ?? ""}
                        </p>
                      </div>
                      <Badge
                        color={
                          managerRole.status === "verified" ? "emerald" : "amber"
                        }
                        uppercase
                      >
                        {managerRole.status === "verified"
                          ? "Verificado"
                          : "Pendiente"}
                      </Badge>
                      <Button
                        type="button"
                        variant="danger"
                        size="xs"
                        onClick={() => handleDemote(managerRole.id, name)}
                      >
                        Quitar rol
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {mgrBwd.map((buildingId) => {
                        const building = buildingsMap[buildingId];
                        return (
                          <span
                            key={buildingId}
                            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                          >
                            {building?.name ?? "Torre"}
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveTower(managerRole.id, buildingId)
                              }
                              className="text-zinc-400 hover:text-red-600"
                              aria-label={`Quitar ${building?.name ?? "torre"}`}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}

                      {availableBuildings.length > 0 && (
                        <div className="flex items-center gap-2">
                          {addingTowerForRole === managerRole.id ? (
                            <>
                              <Select
                                value={newTowerId}
                                onChange={(e) => setNewTowerId(e.target.value)}
                              >
                                <option value="">Selecciona torre</option>
                                {availableBuildings.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name}
                                  </option>
                                ))}
                              </Select>
                              <Button
                                size="xs"
                                variant="primary"
                                onClick={() => handleAddTower(managerRole.id)}
                                disabled={!newTowerId}
                              >
                                Agregar
                              </Button>
                              <Button
                                size="xs"
                                variant="secondary"
                                onClick={() => {
                                  setAddingTowerForRole(null);
                                  setNewTowerId("");
                                }}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAddingTowerForRole(managerRole.id);
                                setNewTowerId("");
                              }}
                              className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            >
                              + Añadir torre
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {editingResident && (
        <EditResidentContactModal
          isOpen={Boolean(editingResident)}
          onClose={() => setEditingResident(null)}
          resident={editingResident}
        />
      )}
    </div>
  );
}
