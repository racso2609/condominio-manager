"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { getCondominium } from "@/lib/services/condominiumService";
import { createPaymentMethod } from "@/lib/services/paymentMethodService";
import { Condominium, PaymentMethodType } from "@/lib/types";
import { FormSkeleton } from "@/components/skeleton";

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
  const [condominium, setCondominium] = useState<Condominium | null>(null);
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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  const visibleFields = FIELDS_BY_TYPE[type];
  const isVisible = (field: string) => visibleFields.includes(field);

  useEffect(() => {
    if (!params.id) return;
    const id = params.id as string;
    getCondominium(id).then((c) => {
      if (!c) router.replace("/home");
      else setCondominium(c);
      setLoading(false);
    });
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser || !params.id || !condominium) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      alert("Ingresa un nombre para el método de pago.");
      return;
    }

    setSaving(true);
    try {
      await createPaymentMethod({
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
      });

      router.push(`/condominium/${params.id}/payment-methods`);
    } catch {
      alert("Error al crear el método de pago");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <FormSkeleton titleWidth="w-56" inputCount={7} />;
  }

  if (!isAdminOrManager) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <p className="text-zinc-500 dark:text-zinc-400">
          No tienes permisos para crear métodos de pago.
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
          href={`/condominium/${params.id}`}
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          {condominium.name}
        </Link>
        <span>/</span>
        <Link
          href={`/condominium/${params.id}/payment-methods`}
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          Métodos de pago
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">Nuevo</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Nuevo método de pago
        </h1>
      </div>

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
            href={`/condominium/${params.id}/payment-methods`}
            className="flex h-10 items-center rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
