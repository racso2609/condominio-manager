"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { useAuthContext } from "@/context/authContext";
import { useCondominium } from "@/lib/queries/useCondominium";
import { useCondominiumPermissions } from "@/hooks/useCondominiumPermissions";
import { useExpense } from "@/lib/queries/useExpense";
import { useEntriesByExpense } from "@/lib/queries/useExpenseEntry";
import { useUnits } from "@/lib/queries/useUnit";
import { useBuildingsByCondominium } from "@/lib/queries/useBuilding";
import { useUser } from "@/lib/queries/useUser";
import { useMarkEntryAsPaid } from "@/lib/mutations/useExpenseEntryMutations";
import { useRestoreExpense } from "@/lib/mutations/useExpenseMutations";
import {
  getExpenseCancellationInfo,
  getCleanExpenseDescription,
} from "@/lib/utils/expense";
import { DeleteExpenseModal } from "@/components/DeleteExpenseModal";
import BuildingExpenseEntriesList from "@/components/BuildingExpenseEntriesList";
import { PageSkeleton } from "@/components/skeleton";
import { PermissionDenied } from "@/components/PermissionDenied";

export default function ExpenseDetailPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;
  const expenseId = params.expenseId as string;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setDebouncedSearch("");
  };

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);
  const { data: expense, isLoading: expenseLoading } = useExpense(expenseId);
  const { data: entries = [], isLoading: entriesLoading } =
    useEntriesByExpense(expenseId);
  const { data: buildings = [], isLoading: buildingsLoading } =
    useBuildingsByCondominium(condominiumId);

  const cancellationInfo = useMemo(
    () => getExpenseCancellationInfo(expense),
    [expense]
  );
  const isCancelled = cancellationInfo.isCancelled;

  const { data: canceller } = useUser(cancellationInfo.deletedBy ?? undefined);
  const { mutate: restoreExpenseMutate, isPending: isRestoring } =
    useRestoreExpense();

  const unitIds = useMemo(
    () => Array.from(new Set(entries.map((e) => e.unit))),
    [entries]
  );
  const unitsQueries = useUnits(unitIds);

  const units = useMemo(() => {
    const map: Record<string, import("@/lib/types").Unit> = {};
    unitsQueries.forEach((q) => {
      if (q.data) map[q.data.id] = q.data;
    });
    return map;
  }, [unitsQueries]);

  const buildingsMap = useMemo(() => {
    const map: Record<string, import("@/lib/types").Building> = {};
    buildings.forEach((b) => {
      map[b.id] = b;
    });
    return map;
  }, [buildings]);

  const { mutate: markAsPaid, isPending: isValidating } = useMarkEntryAsPaid();

  const { isCondoAdmin, isAdminOrManager, canManageBuilding } =
    useCondominiumPermissions(condominiumId);

  const canManageExpense =
    isCondoAdmin ||
    (!!expense?.building && canManageBuilding(expense.building));

  useEffect(() => {
    if (
      !condominiumLoading &&
      !expenseLoading &&
      (condominium === null || expense === null)
    ) {
      router.replace("/home");
    }
  }, [condominiumLoading, expenseLoading, condominium, expense, router]);

  const handleValidate = (entryId: string, note: string) => {
    if (!appUser) return;

    markAsPaid({
      id: entryId,
      data: { notes: note, validated_by: appUser.id },
    });
  };

  const handleRestore = () => {
    if (!confirm("¿Deseas reactivar este gasto?")) return;
    restoreExpenseMutate(expenseId, {
      onError: (err) => {
        alert(`Error al reactivar el gasto: ${(err as Error).message}`);
      },
    });
  };

  const loading =
    condominiumLoading ||
    expenseLoading ||
    entriesLoading ||
    buildingsLoading ||
    unitsQueries.some((q) => q.isLoading);

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="w-56"
        action={false}
        statsCount={1}
        cardCount={4}
        cardLines={2}
      />
    );
  }

  if (!isAdminOrManager || !canManageExpense) {
    return (
      <PermissionDenied message="No tienes permisos para ver esta página." />
    );
  }

  if (!condominium || !expense) return null;

  const paidEntries = entries.filter(
    (e) =>
      e.status === "paid" ||
      e.status === "pending_validation" ||
      Boolean(e.payment_reference) ||
      Boolean(e.payment_proof_url)
  );
  const totalPaid = entries.filter((e) => e.status === "paid").length;
  const totalPaidAmount = paidEntries
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + e.amount, 0);

  const cleanDescription = getCleanExpenseDescription(expense.description);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: condominium.name, href: `/condominium/${condominium.id}` },
          {
            label: "Gastos",
            href: `/condominium/${condominium.id}/expenses`,
          },
          { label: expense.title },
        ]}
      />

      <PageHeader
        title={expense.title}
        subtitle={`${condominium.name} · Vence: ${new Date(expense.due_date).toLocaleDateString()}`}
        action={
          !isCancelled ? (
            <Button
              variant="danger"
              size="md"
              onClick={() => setShowDeleteModal(true)}
            >
              Eliminar gasto
            </Button>
          ) : undefined
        }
      />

      {/* Cancellation Alert Banner */}
      {isCancelled && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge color="red">Gasto Anulado / Eliminado</Badge>
                {cancellationInfo.deletedAt && (
                  <span className="text-xs text-red-700 dark:text-red-300">
                    {new Date(cancellationInfo.deletedAt).toLocaleString()}
                  </span>
                )}
              </div>
              {cancellationInfo.reason && (
                <p className="mt-2 text-sm text-red-900 dark:text-red-200">
                  <span className="font-semibold">Motivo de eliminación:</span>{" "}
                  {cancellationInfo.reason}
                </p>
              )}
              {canceller && (
                <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                  Anulado por: {canceller.name} ({canceller.email})
                </p>
              )}
              <p className="mt-2 text-xs text-red-800/80 dark:text-red-300/80 leading-relaxed">
                Este gasto fue anulado por la administración. Las cuotas no
                pagadas fueron eliminadas para mantener limpia la base de
                datos, conservando únicamente los registros y comprobantes de
                los pagos realizados como evidencia contable.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRestore}
              disabled={isRestoring}
              className="self-start sm:self-auto shrink-0"
            >
              {isRestoring ? "Reactivando..." : "Reactivar gasto"}
            </Button>
          </div>
        </div>
      )}

      {/* Summary card */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {isCancelled ? "Evidencia de pagos conservados" : "Progreso de cobro"}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {isCancelled ? `${entries.length} pago(s)` : `${totalPaid}/${entries.length}`}
          </p>
          {isCancelled && (
            <p className="mt-1 text-xs text-zinc-500">
              Monto recaudado: ${totalPaidAmount.toFixed(2)}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Monto total presupuestado
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            ${expense.amount.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Estado: {isCancelled ? "Anulado" : "Activo"}
          </p>
        </div>
      </div>

      {cleanDescription && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Descripción
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {cleanDescription}
          </p>
        </section>
      )}

      {expense.items && expense.items.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Conceptos
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
            <div className="flex flex-col gap-2">
              {expense.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {item.description}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    ${item.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Total
              </span>
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                ${expense.amount.toFixed(2)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Units & payments section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            {isCancelled
              ? `Evidencia de pagos de inquilinos (${entries.length})`
              : `Pagos por unidad (${entries.length})`}
          </h2>
          {isCancelled && paidEntries.length > 0 && (
            <Badge color="amber">
              {paidEntries.length} pago(s) registrado(s)
            </Badge>
          )}
        </div>

        {/* Search input */}
        <div className="relative flex items-center">
          <svg
            className="pointer-events-none absolute left-3.5 h-4 w-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                handleClearSearch();
              }
            }}
            placeholder="Buscar por apto, residente, recibo o referencia..."
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-10 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:text-zinc-50 dark:placeholder-zinc-600 dark:focus:border-zinc-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <BuildingExpenseEntriesList
          buildings={buildings}
          expense={expense}
          search={debouncedSearch}
          onClearSearch={handleClearSearch}
          isCancelled={isCancelled}
          onValidate={handleValidate}
          isValidating={isValidating}
        />
      </section>

      {/* Delete / Cancel Expense Modal */}
      {appUser && (
        <DeleteExpenseModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          expense={expense}
          entries={entries}
          units={units}
          buildings={buildingsMap}
          currentUserId={appUser.id}
          onSuccess={(wasCancelled) => {
            if (!wasCancelled) {
              // If completely hard-deleted, redirect to expenses list
              router.push(`/condominium/${condominiumId}/expenses`);
            }
          }}
        />
      )}
    </div>
  );
}

