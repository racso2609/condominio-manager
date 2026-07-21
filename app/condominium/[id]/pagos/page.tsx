"use client";

import { useEffect, useMemo, useState } from "react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { useCondominiumPage } from "@/hooks/useCondominiumPage";
import { useUnitsByOwner } from "@/lib/queries/useUnit";
import { useBuildings } from "@/lib/queries/useBuilding";
import { useEntriesByUnits } from "@/lib/queries/useExpenseEntry";
import {
  useExpensesByCondominium,
  useExpensesByBuildings,
} from "@/lib/queries/useExpense";
import { usePaymentMethodsByCondominium } from "@/lib/queries/usePaymentMethod";
import { useReportPayment } from "@/lib/mutations/useExpenseEntryMutations";
import { generatePaymentReceipt } from "@/lib/utils/receipt";
import { PaymentMethodCard } from "@/components/PaymentMethodCard";
import PaymentOrderItem from "@/components/PaymentOrderItem";
import { PaymentsSkeleton } from "@/components/skeleton";
import { FormField, Input, Select } from "@/components/Form";

interface DollarRate {
  moneda: string;
  fuente: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio: number;
  fechaActualizacion: string;
}

export default function ResidentPagosPage() {
  const {
    appUser,
    condominiumId,
    condominium,
    condominiumLoading,
  } = useCondominiumPage();
  const { data: userUnits = [], isLoading: unitsLoading } = useUnitsByOwner(
    appUser?.id
  );
  const { data: paymentMethods = [], isLoading: methodsLoading } =
    usePaymentMethodsByCondominium(condominiumId);

  const buildingIds = useMemo(
    () => Array.from(new Set(userUnits.map((u) => u.building))),
    [userUnits]
  );
  const buildingsQueries = useBuildings(buildingIds);

  const buildings = useMemo(() => {
    const map: Record<string, import("@/lib/types").Building> = {};
    buildingsQueries.forEach((q) => {
      if (q.data) map[q.data.id] = q.data;
    });
    return map;
  }, [buildingsQueries]);

  const units = useMemo(() => {
    return userUnits.filter((u) => {
      const b = buildings[u.building];
      return b && b.condominium === condominiumId;
    });
  }, [userUnits, buildings, condominiumId]);

  const unitIds = useMemo(() => units.map((u) => u.id), [units]);
  const unitMap = useMemo(() => {
    const map: Record<string, import("@/lib/types").Unit> = {};
    units.forEach((u) => {
      map[u.id] = u;
    });
    return map;
  }, [units]);

  const { data: entries = [], isLoading: entriesLoading } =
    useEntriesByUnits(unitIds);

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

  const [dolarRate, setDolarRate] = useState<number | null>(null);
  const [reportingEntryId, setReportingEntryId] = useState<string | null>(null);
  const [reportPaymentMethod, setReportPaymentMethod] = useState("");
  const [reportReference, setReportReference] = useState("");
  const [reportProof, setReportProof] = useState<File | null>(null);

  const { mutate: reportPayment, isPending: reporting } = useReportPayment();

  useEffect(() => {
    if (!condominium) return;
    fetch("https://ve.dolarapi.com/v1/dolares")
      .then((res) => res.json())
      .then((rates: DollarRate[]) => {
        const parallel = rates.find((r) => r.fuente === "paralelo");
        if (parallel?.promedio) setDolarRate(parallel.promedio);
      })
      .catch(() => setDolarRate(null));
  }, [condominium]);

  const formatBs = (amount: number) =>
    amount.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleReportPayment = (entryId: string) => {
    if (!appUser) return;

    reportPayment(
      {
        entryId,
        data: {
          payment_method_id: reportPaymentMethod || undefined,
          payment_reference: reportReference,
          payment_proof: reportProof ?? undefined,
          reported_by: appUser.id,
        },
      },
      {
        onSuccess: () => {
          setReportingEntryId(null);
          setReportPaymentMethod("");
          setReportReference("");
          setReportProof(null);
        },
      }
    );
  };

  const handleDownloadReceipt = (entry: import("@/lib/types").ExpenseEntry) => {
    const expense = expenses[entry.expense];
    const unit = unitMap[entry.unit];
    const building = unit ? buildings[unit.building] : undefined;
    const paymentMethod = entry.payment_method_id
      ? paymentMethods.find((m) => m.id === entry.payment_method_id)
      : undefined;

    if (!expense || !unit || !condominium) {
      alert("No se encontró toda la información necesaria para generar el recibo.");
      return;
    }

    generatePaymentReceipt({
      condominium,
      building,
      unit,
      expense,
      entry,
      paymentMethod,
    });
  };

  const pendingEntries = entries.filter(
    (e) => e.status === "pending" || e.status === "pending_validation"
  );
  const paidEntries = entries.filter((e) => e.status === "paid");
  const totalPending = pendingEntries.reduce((s, e) => s + e.amount, 0);
  const totalPaid = paidEntries.reduce((s, e) => s + e.amount, 0);

  const loading =
    condominiumLoading ||
    unitsLoading ||
    methodsLoading ||
    entriesLoading ||
    condoExpensesLoading ||
    buildingsQueries.some((q) => q.isLoading) ||
    buildingExpensesQueries.some((q) => q.isLoading);

  if (loading) {
    return <PaymentsSkeleton />;
  }

  if (!condominium) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: condominium.name, href: `/condominium/${condominium.id}` },
          { label: "Mis pagos" },
        ]}
      />

      <PageHeader title="Mis pagos" subtitle={condominium.name} />

      {units.length === 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-zinc-500 dark:text-zinc-400">
            No tienes unidades registradas en este condominio.
          </p>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Pendiente
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                ${totalPending.toFixed(2)}
              </p>
              {dolarRate && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  ≈ Bs {formatBs(totalPending * dolarRate)}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Pagado
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                ${totalPaid.toFixed(2)}
              </p>
              {dolarRate && (
                <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-400/80">
                  ≈ Bs {formatBs(totalPaid * dolarRate)}
                </p>
              )}
            </div>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Detalle de cargos
            </h2>
            {entries.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No hay cargos registrados para tus unidades.
              </p>
            ) : (
              entries.map((entry) => {
                const expense = expenses[entry.expense];
                const unit = unitMap[entry.unit];
                const isReporting = reportingEntryId === entry.id;

                return (
                  <div key={entry.id}>
                    <PaymentOrderItem
                      entry={entry}
                      expense={expense}
                      unit={unit}
                      building={unit ? buildings[unit.building] : undefined}
                      showReportButton
                      onReport={() => setReportingEntryId(entry.id)}
                      vesAmount={
                        dolarRate ? entry.amount * dolarRate : undefined
                      }
                    />

                    {entry.status === "paid" && (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDownloadReceipt(entry)}
                          className="text-xs font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
                        >
                          Descargar recibo
                        </button>
                      </div>
                    )}

                    {isReporting && (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
                        <div className="flex flex-col gap-3">
                          <FormField label="Método de pago usado">
                            <Select
                              value={reportPaymentMethod}
                              onChange={(e) =>
                                setReportPaymentMethod(e.target.value)
                              }
                            >
                              <option value="">Selecciona un método</option>
                              {paymentMethods.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </Select>
                          </FormField>

                          <FormField label="Número de transferencia / referencia">
                            <Input
                              type="text"
                              value={reportReference}
                              onChange={(e) =>
                                setReportReference(e.target.value)
                              }
                              placeholder="Ej. 123456789"
                            />
                          </FormField>

                          <FormField label="Captura / comprobante (opcional)">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                setReportProof(e.target.files?.[0] ?? null)
                              }
                              className="text-sm text-zinc-700 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-900 hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-50 dark:hover:file:bg-zinc-700"
                            />
                          </FormField>

                          <div className="flex gap-3">
                            <Button
                              onClick={() => handleReportPayment(entry.id)}
                              disabled={
                                reporting ||
                                (!reportPaymentMethod && !reportReference)
                              }
                              variant="emerald"
                              size="lg"
                            >
                              {reporting ? "Enviando..." : "Enviar reporte"}
                            </Button>
                            <Button
                              onClick={() => {
                                setReportingEntryId(null);
                                setReportPaymentMethod("");
                                setReportReference("");
                                setReportProof(null);
                              }}
                              disabled={reporting}
                              variant="secondary"
                              size="lg"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Métodos de pago disponibles
            </h2>
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Aún no hay métodos de pago configurados para este condominio.
              </p>
            ) : (
              paymentMethods.map((method) => (
                <PaymentMethodCard key={method.id} method={method} />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
