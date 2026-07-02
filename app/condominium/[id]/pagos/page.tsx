"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { useCondominium } from "@/lib/queries/useCondominium";
import { useUnitsByOwner } from "@/lib/queries/useUnit";
import { useBuildings } from "@/lib/queries/useBuilding";
import { useEntriesByUnits } from "@/lib/queries/useExpenseEntry";
import {
  useExpensesByCondominium,
  useExpensesByBuildings,
} from "@/lib/queries/useExpense";
import { usePaymentMethodsByCondominium } from "@/lib/queries/usePaymentMethod";
import { useReportPayment } from "@/lib/mutations/useExpenseEntryMutations";
import {
  PaymentMethodType,
} from "@/lib/types";
import PaymentOrderItem from "@/components/PaymentOrderItem";
import { PaymentsSkeleton } from "@/components/skeleton";

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  bank_transfer: "Transferencia bancaria",
  mobile_payment: "Pago móvil",
  zelle: "Zelle",
  paypal: "PayPal",
  venmo: "Venmo",
  cash: "Efectivo",
  other: "Otro",
};

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
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);
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

  useEffect(() => {
    if (!condominiumLoading && condominium === null) {
      router.replace("/home");
    }
  }, [condominiumLoading, condominium, router]);

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
        <span className="text-zinc-900 dark:text-zinc-50">Mis pagos</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mis pagos
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {condominium.name}
        </p>
      </div>

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

                    {isReporting && (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
                        <div className="flex flex-col gap-3">
                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              Método de pago usado
                            </span>
                            <select
                              value={reportPaymentMethod}
                              onChange={(e) =>
                                setReportPaymentMethod(e.target.value)
                              }
                              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
                            >
                              <option value="">Selecciona un método</option>
                              {paymentMethods.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              Número de transferencia / referencia
                            </span>
                            <input
                              type="text"
                              value={reportReference}
                              onChange={(e) =>
                                setReportReference(e.target.value)
                              }
                              placeholder="Ej. 123456789"
                              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
                            />
                          </label>

                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              Captura / comprobante (opcional)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                setReportProof(e.target.files?.[0] ?? null)
                              }
                              className="text-sm text-zinc-700 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-900 hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-50 dark:hover:file:bg-zinc-700"
                            />
                          </label>

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
                <div
                  key={method.id}
                  className={`rounded-xl border bg-white p-5 dark:bg-black ${
                    method.is_default
                      ? "border-emerald-200 dark:border-emerald-900/50"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                      {method.name}
                    </h3>
                    {method.is_default && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Predeterminado
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {TYPE_LABELS[method.type]}
                  </p>

                  <div className="mt-3 grid gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {method.holder_name && (
                      <p>
                        <span className="text-zinc-500">Titular:</span>{" "}
                        {method.holder_name}
                      </p>
                    )}
                    {method.bank_name && (
                      <p>
                        <span className="text-zinc-500">Banco:</span>{" "}
                        {method.bank_name}
                      </p>
                    )}
                    {method.account_number && (
                      <p>
                        <span className="text-zinc-500">Cuenta:</span>{" "}
                        {method.account_number}
                      </p>
                    )}
                    {method.routing_number && (
                      <p>
                        <span className="text-zinc-500">Routing:</span>{" "}
                        {method.routing_number}
                      </p>
                    )}
                    {method.phone && (
                      <p>
                        <span className="text-zinc-500">Teléfono:</span>{" "}
                        {method.phone}
                      </p>
                    )}
                    {method.email && (
                      <p>
                        <span className="text-zinc-500">Correo:</span>{" "}
                        {method.email}
                      </p>
                    )}
                    {method.identification && (
                      <p>
                        <span className="text-zinc-500">Documento:</span>{" "}
                        {method.identification}
                      </p>
                    )}
                  </div>

                  {method.notes && (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                      {method.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
