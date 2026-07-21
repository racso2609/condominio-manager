"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader } from "@/components/PageHeader";
import { useAuthContext } from "@/context/authContext";
import { useCondominium } from "@/lib/queries/useCondominium";
import { useCreatePaymentMethod } from "@/lib/mutations/usePaymentMethodMutations";
import { PaymentMethodType } from "@/lib/types";
import { FormSkeleton } from "@/components/skeleton";
import { PermissionDenied } from "@/components/PermissionDenied";

const TYPE_OPTIONS: { value: PaymentMethodType; label: string }[] = [
  { value: "bank_transfer", label: "Transferencia bancaria" },
  { value: "mobile_payment", label: "Pago móvil" },
  { value: "zelle", label: "Zelle" },
  { value: "paypal", label: "PayPal" },
  { value: "venmo", label: "Venmo" },
  { value: "cash", label: "Efectivo" },
  { value: "other", label: "Otro" },
];

const FIELDS_BY_TYPE: Record<PaymentMethodType, string[]> = {
  bank_transfer: [
    "holder_name",
    "bank_name",
    "account_number",
    "routing_number",
    "identification",
  ],
  mobile_payment: ["phone", "identification", "bank_name"],
  zelle: ["email", "phone"],
  paypal: ["email"],
  venmo: ["phone"],
  cash: [],
  other: [],
};

export default function NewPaymentMethodPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);

  const [type, setType] = useState<PaymentMethodType>("bank_transfer");
  const [name, setName] = useState("");
  const [holderName, setHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [identification, setIdentification] = useState("");
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const { mutate: createPaymentMethod, isPending: saving } =
    useCreatePaymentMethod();

  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  const visibleFields = FIELDS_BY_TYPE[type];
  const isVisible = (field: string) => visibleFields.includes(field);

  useEffect(() => {
    if (!condominiumLoading && condominium === null) {
      router.replace("/home");
    }
  }, [condominiumLoading, condominium, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser || !condominium) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      alert("Ingresa un nombre para el método de pago.");
      return;
    }

    createPaymentMethod(
      {
        condominium: condominium.id,
        name: trimmedName,
        type,
        holder_name: isVisible("holder_name")
          ? holderName.trim() || undefined
          : undefined,
        bank_name: isVisible("bank_name")
          ? bankName.trim() || undefined
          : undefined,
        account_number: isVisible("account_number")
          ? accountNumber.trim() || undefined
          : undefined,
        routing_number: isVisible("routing_number")
          ? routingNumber.trim() || undefined
          : undefined,
        phone: isVisible("phone") ? phone.trim() || undefined : undefined,
        email: isVisible("email") ? email.trim() || undefined : undefined,
        identification: isVisible("identification")
          ? identification.trim() || undefined
          : undefined,
        notes: notes.trim() || undefined,
        is_default: isDefault,
      },
      {
        onSuccess: () =>
          router.push(`/condominium/${condominiumId}/payment-methods`),
        onError: () => alert("Error al crear el método de pago"),
      }
    );
  };

  if (condominiumLoading) {
    return <FormSkeleton titleWidth="w-56" inputCount={7} />;
  }

  if (!isAdminOrManager) {
    return (
      <PermissionDenied message="No tienes permisos para crear métodos de pago." />
    );
  }

  if (!condominium) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: condominium.name, href: `/condominium/${condominiumId}` },
          {
            label: "Métodos de pago",
            href: `/condominium/${condominiumId}/payment-methods`,
          },
          { label: "Nuevo" },
        ]}
      />

      <PageHeader title="Nuevo método de pago" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Tipo de método
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PaymentMethodType)}
              required
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Nombre del método
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Cuenta corriente Banco Mercantil"
              required
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
            />
          </label>

          {isVisible("holder_name") && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Nombre del titular
              </span>
              <input
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              />
            </label>
          )}

          {isVisible("bank_name") && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Banco
              </span>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              />
            </label>
          )}

          {isVisible("account_number") && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Número de cuenta
              </span>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              />
            </label>
          )}

          {isVisible("routing_number") && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Routing / ABA
              </span>
              <input
                type="text"
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              />
            </label>
          )}

          {isVisible("identification") && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Documento de identidad
              </span>
              <input
                type="text"
                value={identification}
                onChange={(e) => setIdentification(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              />
            </label>
          )}

          {isVisible("phone") && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Teléfono
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              />
            </label>
          )}

          {isVisible("email") && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Correo electrónico
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Notas adicionales
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-y rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 accent-zinc-900 dark:accent-zinc-50"
            />
            Establecer como método de pago predeterminado
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="h-10 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            {saving ? "Creando..." : "Crear método"}
          </button>
          <Link
            href={`/condominium/${condominiumId}/payment-methods`}
            className="flex h-10 items-center rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
