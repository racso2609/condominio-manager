"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { useCondominium, useCondominiumRoles } from "@/lib/queries/useCondominium";
import { useBuildingsByCondominium } from "@/lib/queries/useBuilding";
import { useUnitsByBuildings } from "@/lib/queries/useUnit";
import { useUsers } from "@/lib/queries/useUser";
import {
  useExpensesByCondominium,
  useExpensesByBuildings,
} from "@/lib/queries/useExpense";
import { useEntriesByExpenses } from "@/lib/queries/useExpenseEntry";
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
} from "@/lib/mutations/useCondominiumMutations";
import { useMarkEntryAsPaid } from "@/lib/mutations/useExpenseEntryMutations";
import {
  CondominiumRole,
  Unit,
  Building,
  ExpenseEntry,
  PaymentMethodType,
} from "@/lib/types";
import { Button } from "@/components/Button";
import Collapse from "@/components/Collapse";
import PaymentOrderItem from "@/components/PaymentOrderItem";
import { ResidentsSkeleton } from "@/components/skeleton";

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  bank_transfer: "Transferencia bancaria",
  mobile_payment: "Pago móvil",
  zelle: "Zelle",
  paypal: "PayPal",
  venmo: "Venmo",
  cash: "Efectivo",
  other: "Otro",
};

export default function ResidentsPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);
  const { data: roles = [], isLoading: rolesLoading } =
    useCondominiumRoles(condominiumId);
  const { data: buildings = [], isLoading: buildingsLoading } =
    useBuildingsByCondominium(condominiumId);
  const { data: paymentMethods = [], isLoading: methodsLoading } =
    usePaymentMethodsByCondominium(condominiumId);

  const buildingIds = useMemo(() => buildings.map((b) => b.id), [buildings]);
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
    return Array.from(ids);
  }, [allUnits, roles]);

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

  const { mutate: rejectUnitClaim, isPending: rejecting } = useRejectUnitClaim();
  const { mutate: removeUnitOwner, isPending: removing } = useRemoveUnitOwner();
  const { mutate: verifyUnitOwner, isPending: verifyingUnit } =
    useVerifyUnitOwner();
  const { mutate: assignUnitOwner, isPending: assigning } = useAssignUnitOwner();
  const { mutate: verifyRole } = useVerifyRole();
  const { mutate: deleteCondominiumRole } = useDeleteCondominiumRole();
  const { mutate: markEntryAsPaid, isPending: validatingPayment } =
    useMarkEntryAsPaid();

  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!condominiumLoading && condominium === null) {
      router.replace("/home");
    }
  }, [condominiumLoading, condominium, router]);

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

  const getPendingEntriesForOwner = (ownerId: string): ExpenseEntry[] => {
    const units = unitsByOwner[ownerId] ?? [];
    const entries: ExpenseEntry[] = [];
    for (const u of units) {
      const unitEntries = entriesByUnit[u.id] ?? [];
      entries.push(...unitEntries.filter((e) => e.status !== "paid"));
    }
    return entries;
  };

  const getTotalPendingForOwner = (ownerId: string): number => {
    return getPendingEntriesForOwner(ownerId).reduce((s, e) => s + e.amount, 0);
  };

  const residentRoles = Object.values(
    roles
      .filter(
        (r) =>
          r.role === "resident" ||
          (r.role === "administrator" && unitsByOwner[r.user]?.length > 0)
      )
      .reduce<Record<string, CondominiumRole>>((acc, r) => {
        const existing = acc[r.user];
        if (!existing) {
          acc[r.user] = r;
          return acc;
        }
        const existingScore =
          (existing.status === "verified" ? 2 : 0) +
          (existing.role === "administrator" ? 1 : 0);
        const newScore =
          (r.status === "verified" ? 2 : 0) +
          (r.role === "administrator" ? 1 : 0);
        if (newScore > existingScore) {
          acc[r.user] = r;
        }
        return acc;
      }, {})
  );

  const buildingsMap = useMemo(() => {
    const map: Record<string, Building> = {};
    buildings.forEach((b) => {
      map[b.id] = b;
    });
    return map;
  }, [buildings]);

  const loading =
    condominiumLoading ||
    rolesLoading ||
    buildingsLoading ||
    methodsLoading ||
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
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <p className="text-zinc-500 dark:text-zinc-400">
          No tienes permisos para gestionar residentes.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/home"
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          Mis condominios
        </Link>
        <span>/</span>
        <Link
          href={`/condominium/${condominium.id}`}
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          {condominium.name}
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">Residentes</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Gestionar residentes
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {condominium.name}
        </p>
      </div>

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
            return (
              <Collapse
                key={r.id}
                title={owner?.name ?? r.invited_email ?? "Pendiente"}
                subtitle={
                  owner?.email
                    ? [owner.email, owner.phone].filter(Boolean).join(" · ")
                    : r.invited_email ?? ""
                }
                badge={
                  <div className="flex items-center gap-2">
                    {totalPending > 0 && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        ${totalPending.toFixed(2)} pendiente
                      </span>
                    )}
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                        r.status === "verified"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {r.status === "verified" ? "Verificado" : "Pendiente"}
                    </span>
                  </div>
                }
              >
                {units.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-zinc-400">
                      Sin unidades asignadas
                    </p>
                    {assigningForRole === r.id ? (
                      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Edificio
                          </span>
                          <select
                            value={assignBuildingId}
                            onChange={(e) => {
                              setAssignBuildingId(e.target.value);
                              setAssignUnitId("");
                            }}
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
                          >
                            <option value="">Selecciona un edificio</option>
                            {buildings.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Unidad
                          </span>
                          <select
                            value={assignUnitId}
                            onChange={(e) => setAssignUnitId(e.target.value)}
                            disabled={!assignBuildingId}
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
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
                          </select>
                        </label>
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
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                u.type === "residential"
                                  ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}
                            >
                              {u.type === "residential" ? "Hab." : "Ofi."}
                            </span>
                            <span
                              className={`ml-auto text-[10px] font-medium ${
                                u.owner_status === "verified"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {u.owner_status === "verified"
                                ? "Verificado"
                                : "Pendiente"}
                            </span>
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
                            <div
                              key={method.id}
                              className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-black"
                            >
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                  {method.name}
                                </p>
                                {method.is_default && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    Predeterminado
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500">
                                {TYPE_LABELS[method.type]}
                              </p>
                              <div className="mt-2 grid gap-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                                {method.holder_name && (
                                  <p>Titular: {method.holder_name}</p>
                                )}
                                {method.bank_name && (
                                  <p>Banco: {method.bank_name}</p>
                                )}
                                {method.account_number && (
                                  <p>Cuenta: {method.account_number}</p>
                                )}
                                {method.routing_number && (
                                  <p>Routing: {method.routing_number}</p>
                                )}
                                {method.phone && <p>Teléfono: {method.phone}</p>}
                                {method.email && <p>Correo: {method.email}</p>}
                                {method.identification && (
                                  <p>Documento: {method.identification}</p>
                                )}
                              </div>
                              {method.notes && (
                                <p className="mt-2 text-xs text-zinc-500">
                                  {method.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Collapse>
            );
          })}
        </div>
      </section>
    </div>
  );
}
