"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { useCondominium } from "@/lib/queries/useCondominium";
import { usePaymentMethodsByCondominium } from "@/lib/queries/usePaymentMethod";
import { useDeletePaymentMethod } from "@/lib/mutations/usePaymentMethodMutations";
import { PaymentMethodType } from "@/lib/types";
import { PageSkeleton } from "@/components/skeleton";

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  bank_transfer: "Transferencia bancaria",
  mobile_payment: "Pago móvil",
  zelle: "Zelle",
  paypal: "PayPal",
  venmo: "Venmo",
  cash: "Efectivo",
  other: "Otro",
};

export default function PaymentMethodsPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);
  const { data: methods = [], isLoading: methodsLoading } =
    usePaymentMethodsByCondominium(condominiumId);

  const { mutate: deletePaymentMethod, isPending: isDeleting } =
    useDeletePaymentMethod();

  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!condominiumLoading && condominium === null) {
      router.replace("/home");
    }
  }, [condominiumLoading, condominium, router]);

  const handleDelete = (methodId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este método de pago?"))
      return;

    deletePaymentMethod(methodId);
  };

  const loading = condominiumLoading || methodsLoading;

  if (loading) {
    return <PageSkeleton titleWidth="w-48" cardCount={3} cardLines={3} />;
  }

  if (!isAdminOrManager) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <p className="text-zinc-500 dark:text-zinc-400">
          No tienes permisos para gestionar métodos de pago.
        </p>
      </div>
    );
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
        <span className="text-zinc-900 dark:text-zinc-50">Métodos de pago</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Métodos de pago
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {condominium.name}
          </p>
        </div>
        <Button
          href={`/condominium/${condominium.id}/payment-methods/new`}
          variant="primary"
          size="lg"
        >
          Nuevo método
        </Button>
      </div>

      {methods.length === 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-zinc-500 dark:text-zinc-400">
            No hay métodos de pago registrados.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          {methods.map((method) => (
            <div
              key={method.id}
              className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {method.name}
                    </h2>
                    {method.is_default && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Predeterminado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
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

                <Button
                  type="button"
                  onClick={() => handleDelete(method.id)}
                  disabled={isDeleting}
                  variant="ghost"
                  size="sm"
                  className="h-auto px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {isDeleting ? "..." : "Eliminar"}
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
