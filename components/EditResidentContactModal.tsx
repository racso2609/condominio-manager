"use client";

import { useState } from "react";
import { AppUser } from "@/lib/types";
import { useUpdateUser } from "@/lib/mutations/useUserMutations";
import { FormField, Input, Textarea } from "@/components/Form";
import { Button } from "@/components/Button";

interface EditResidentContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: AppUser | null;
  onSuccess?: () => void;
}

function EditResidentContactForm({
  resident,
  onClose,
  onSuccess,
}: {
  resident: AppUser;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [name, setName] = useState(resident.name || "");
  const [phone, setPhone] = useState(resident.phone || "");
  const [documentId, setDocumentId] = useState(resident.document_id || "");
  const [notes, setNotes] = useState(resident.notes || "");
  const [error, setError] = useState<string | null>(null);

  const { mutate: updateUserMutate, isPending: updating } = useUpdateUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }

    updateUserMutate(
      {
        id: resident.id,
        data: {
          name: name.trim(),
          phone: phone.trim() || null,
          document_id: documentId.trim() || null,
          notes: notes.trim() || null,
        },
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
              : "Error al actualizar los datos del residente"
          );
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Editar datos de contacto
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {resident.name} {resident.is_preregistered ? "(Offline)" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={updating}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
          <FormField label="Nombre completo *">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={updating}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <FormField label="Teléfono / WhatsApp">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+58 412 1234567"
                disabled={updating}
              />
            </FormField>

            <FormField label="Cédula / DNI / RUT">
              <Input
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="V-12.345.678"
                disabled={updating}
              />
            </FormField>
          </div>

          <FormField label="Observaciones / Notas administrativas">
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas para cobranza o contacto..."
              disabled={updating}
            />
          </FormField>

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={updating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={updating || !name.trim()}
            >
              {updating ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditResidentContactModal({
  isOpen,
  onClose,
  resident,
  onSuccess,
}: EditResidentContactModalProps) {
  if (!isOpen || !resident) return null;

  return (
    <EditResidentContactForm
      key={resident.id}
      resident={resident}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
