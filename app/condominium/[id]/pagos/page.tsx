"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { getCondominium } from "@/lib/services/condominiumService";
import { getUnitsByOwner } from "@/lib/services/unitService";
import {
  getExpensesByCondominium,
  getExpensesByBuilding,
} from "@/lib/services/expenseService";
import {
  getEntriesByUnits,
  reportPayment,
} from "@/lib/services/expenseEntryService";
import { getBuilding } from "@/lib/services/buildingService";
import { getPaymentMethodsByCondominium } from "@/lib/services/paymentMethodService";
import {
  Condominium,
  Building,
  Unit,
  Expense,
  ExpenseEntry,
  PaymentMethod,
  PaymentMethodType,
} from "@/lib/types";
import PaymentOrderItem from "@/components/PaymentOrderItem";

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  bank_transfer: "Transferencia bancaria",
  mobile_payment: "Pago móvil",
  zelle: "Zelle",
  paypal: "PayPal",
  venmo: "Venmo",
  cash: "Efectivo",
  other: "Otro",
};

export default function ResidentPagosPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [condominium, setCondominium] = useState<Condominium | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [expenses, setExpenses] = useState<Record<string, Expense>>({});
  const [buildings, setBuildings] = useState<Record<string, Building>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const [reportingEntryId, setReportingEntryId] = useState<string | null>(null);
  const [reportPaymentMethod, setReportPaymentMethod] = useState("");
  const [reportReference, setReportReference] = useState("");
  const [reportProof, setReportProof] = useState<File | null>(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!appUser || !params.id) return;
    const condoId = params.id as string;
    Promise.all([
      getCondominium(condoId),
      getUnitsByOwner(appUser.id),
      getPaymentMethodsByCondominium(condoId),
    ]).then(async ([c, userUnits, methods]) => {
      if (!c) {
        router.replace("/home");
        return;
      }
      setCondominium(c);
      setPaymentMethods(methods);

      const myUnits = userUnits.filter((u) => {
        return true;
      });

      const allBuildingIds = new Set(myUnits.map((u) => u.building));
      const buildingMap: Record<string, Building> = {};
      for (const bid of allBuildingIds) {
        const b = await getBuilding(bid);
        if (b) buildingMap[bid] = b;
      }
      setBuildings(buildingMap);

      const myCondoUnits = myUnits.filter((u) => {
        const b = buildingMap[u.building];
        return b && b.condominium === condoId;
      });
      setUnits(myCondoUnits);

      if (myCondoUnits.length === 0) {
        setLoading(false);
        return;
      }

      const unitIds = myCondoUnits.map((u) => u.id);
      const expenseEntries = await getEntriesByUnits(unitIds);
      setEntries(expenseEntries);

      const expenseIds = new Set(expenseEntries.map((e) => e.expense));
      const expenseMap: Record<string, Expense> = {};
      const condoExpenses = await getExpensesByCondominium(condoId);
      for (const exp of condoExpenses) {
        expenseMap[exp.id] = exp;
      }
      const buildingExpenses = await Promise.all(
        Array.from(allBuildingIds).map((bid) => getExpensesByBuilding(bid))
      );
      for (const exps of buildingExpenses) {
        for (const exp of exps) {
          expenseMap[exp.id] = exp;
        }
      }
      setExpenses(expenseMap);
      setLoading(false);
    });
  }, [appUser, params.id, router]);

  const handleReportPayment = async (entryId: string) => {
    if (!appUser) return;
    setReporting(true);
    try {
      await reportPayment(entryId, {
        payment_method_id: reportPaymentMethod || undefined,
        payment_reference: reportReference,
        payment_proof: reportProof ?? undefined,
        reported_by: appUser.id,
      });

      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                status: "pending_validation",
                payment_method_id: reportPaymentMethod || null,
                payment_reference: reportReference.trim() || null,
                payment_proof_url: e.payment_proof_url,
                reported_by: appUser.id,
              }
            : e
        )
      );

      setReportingEntryId(null);
      setReportPaymentMethod("");
      setReportReference("");
      setReportProof(null);
    } catch {
      alert("Error al reportar el pago");
    } finally {
      setReporting(false);
    }
  };

  const pendingEntries = entries.filter(
    (e) => e.status === "pending" || e.status === "pending_validation"
  );
  const paidEntries = entries.filter((e) => e.status === "paid");
  const totalPending = pendingEntries.reduce((s, e) => s + e.amount, 0);
  const totalPaid = paidEntries.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <div className="h-48 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!condominium) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/home" className="hover:text-zinc-700 dark:hover:text-zinc-200">
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
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Pagado
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                ${totalPaid.toFixed(2)}
              </p>
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
                const unit = units.find((u) => u.id === entry.unit);
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
