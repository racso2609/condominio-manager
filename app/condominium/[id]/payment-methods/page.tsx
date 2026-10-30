"use client";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { useCondominiumPage } from "@/hooks/useCondominiumPage";
import { usePaymentMethodsByCondominium } from "@/lib/queries/usePaymentMethod";
import { useDeletePaymentMethod } from "@/lib/mutations/usePaymentMethodMutations";
import { PaymentMethodCard } from "@/components/PaymentMethodCard";
import { PageSkeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { PermissionDenied } from "@/components/PermissionDenied";

export default function PaymentMethodsPage() {
  const {
    condominiumId,
    condominium,
    condominiumLoading,
    isCondoAdmin,
  } = useCondominiumPage();
  const { data: methods = [], isLoading: methodsLoading } =
    usePaymentMethodsByCondominium(condominiumId);

  const { mutate: deletePaymentMethod, isPending: isDeleting } =
    useDeletePaymentMethod();

  const handleDelete = (methodId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este método de pago?"))
      return;

    deletePaymentMethod(methodId);
  };

  const loading = condominiumLoading || methodsLoading;

  if (loading) {
    return <PageSkeleton titleWidth="w-48" cardCount={3} cardLines={3} />;
  }

  if (!isCondoAdmin) {
    return (
      <PermissionDenied message="No tienes permisos para gestionar métodos de pago." />
    );
  }

  if (!condominium) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: condominium.name, href: `/condominium/${condominium.id}` },
          { label: "Métodos de pago" },
        ]}
      />

      <PageHeader
        title="Métodos de pago"
        subtitle={condominium.name}
        action={
          <Button
            href={`/condominium/${condominium.id}/payment-methods/new`}
            variant="primary"
            size="lg"
          >
            Nuevo método
          </Button>
        }
      />

      {methods.length === 0 ? (
        <EmptyState message="No hay métodos de pago registrados." />
      ) : (
        <section className="flex flex-col gap-4">
          {methods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              actions={
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
              }
            />
          ))}
        </section>
      )}
    </div>
  );
}
