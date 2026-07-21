"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { useUpdateUser } from "@/lib/mutations/useUserMutations";
import { ProfileSkeleton } from "@/components/skeleton";
import { FormField, Input } from "@/components/Form";

export default function ProfilePage() {
  const { user, appUser } = useAuthContext();

  const [name, setName] = useState(appUser?.name ?? "");
  const [phone, setPhone] = useState(appUser?.phone ?? "");
  const [saved, setSaved] = useState(false);

  const { mutate: updateUser, isPending: saving } = useUpdateUser();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    updateUser(
      {
        id: appUser.id,
        data: { name: name.trim(), phone: phone.trim() },
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
        onError: () => alert("Error al guardar"),
      }
    );
  };

  if (!appUser) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/home"
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          Inicio
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">Perfil</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mi perfil
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Actualiza tu información personal
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <FormField label="Nombre">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Correo electrónico">
            <Input
              type="email"
              value={appUser?.email ?? ""}
              disabled
              className="cursor-not-allowed bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
            />
          </FormField>

          <FormField label="Teléfono">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+58 412 123 4567"
            />
          </FormField>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving} variant="primary" size="lg">
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Cambios guardados
            </span>
          )}
        </div>
      </form>

      {user && (
        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Foto de perfil
          </h2>
          <div className="mt-3 flex items-center gap-4">
            <img
              src={
                user.user_metadata?.avatar_url ??
                user.user_metadata?.picture ??
                undefined
              }
              alt=""
              className="h-14 w-14 rounded-full"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              La foto se obtiene de tu cuenta de Google.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
