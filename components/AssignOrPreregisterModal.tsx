"use client";

import { useState } from "react";
import { Unit, Building, AppUser } from "@/lib/types";
import { useAssignUnitOwner } from "@/lib/mutations/useUnitMutations";
import { usePreregisterResident } from "@/lib/mutations/useUserMutations";
import { FormField, Input, Select, Textarea } from "@/components/Form";
import { Button } from "@/components/Button";

interface AssignOrPreregisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit;
  building: Building;
  condominiumId: string;
  existingResidents: AppUser[];
  onSuccess?: () => void;
}

export function AssignOrPreregisterModal({
  isOpen,
  onClose,
  unit,
  building,
  condominiumId,
  existingResidents,
  onSuccess,
}: AssignOrPreregisterModalProps) {
  const [tab, setTab] = useState<"preregister" | "existing">("preregister");
  const [selectedUserId, setSelectedUserId] = useState("");

  // Preregister form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate: assignExisting, isPending: assigning } = useAssignUnitOwner();
  const { mutate: preregister, isPending: preregistering } =
    usePreregisterResident();

  if (!isOpen) return null;

  const isWorking = assigning || preregistering;

  const handleAssignExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setError(null);

    assignExisting(
      { unitId: unit.id, userId: selectedUserId },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
        onError: (err) => {
          setError(
            err instanceof Error ? err.message : "Error al asignar la unidad"
          );
        },
      }
    );
  };

  const handlePreregister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("El nombre y el teléfono son obligatorios");
      return;
    }
    setError(null);

    preregister(
      {
        condominiumId,
        unitId: unit.id,
        name: name.trim(),
        phone: phone.trim(),
        documentId: documentId.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
        onError: (err) => {
          setError(
            err instanceof Error
              ? err.message
              : "Error al preregistrar el propietario"
          );
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Asignar propietario a Unidad {unit.num}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {building.name} · Piso {unit.floor} ({unit.type === "residential" ? "Residencial" : "Oficina"})
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isWorking}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="mt-5 flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => {
              setTab("preregister");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
              tab === "preregister"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Preregistrar nuevo (Offline)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("existing");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
              tab === "existing"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Seleccionar existente
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </div>
        )}

        {tab === "preregister" ? (
          <form onSubmit={handlePreregister} className="mt-4 flex flex-col gap-3.5">
            <FormField label="Nombre completo *">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Carmen Rodríguez"
                required
                disabled={isWorking}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <FormField label="Teléfono / WhatsApp *">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. +58 412 1234567"
                  required
                  disabled={isWorking}
                />
              </FormField>

              <FormField label="Cédula / DNI / RUT (opcional)">
                <Input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Ej. V-12.345.678"
                  disabled={isWorking}
                />
              </FormField>
            </div>

            <FormField label="Correo electrónico (opcional)">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                disabled={isWorking}
              />
            </FormField>

            <FormField label="Observaciones o notas (opcional)">
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Adulto mayor, contactar a su hijo para cobros."
                disabled={isWorking}
              />
            </FormField>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
              💡 Este propietario quedará registrado de forma inmediata con su unidad. Si más adelante ingresa con su correo a la plataforma, se vinculará sin perder recibos ni pagos.
            </div>

            <div className="mt-2 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
                disabled={isWorking}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isWorking || !name.trim() || !phone.trim()}
              >
                {preregistering ? "Registrando..." : "Preregistrar y Asignar"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAssignExisting} className="mt-4 flex flex-col gap-4">
            <FormField label="Selecciona un residente del condominio">
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={isWorking}
                required
              >
                <option value="">Seleccionar persona...</option>
                {existingResidents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.phone ? `(${r.phone})` : ""} {r.is_preregistered ? "[Offline]" : ""}
                  </option>
                ))}
              </Select>
            </FormField>

            {existingResidents.length === 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No hay residentes registrados previamente en este condominio. Usa la pestaña &quot;Preregistrar nuevo&quot;.
              </p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
                disabled={isWorking}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isWorking || !selectedUserId}
              >
                {assigning ? "Asignando..." : "Asignar a esta unidad"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
