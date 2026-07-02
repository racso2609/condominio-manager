"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { updateUser } from "@/lib/services/userService";
import { ProfileSkeleton } from "@/components/skeleton";

export default function ProfilePage() {
  const { user, appUser } = useAuthContext();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (appUser) {
      setName(appUser.name);
      setPhone(appUser.phone ?? "");
    }
  }, [appUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    setSaving(true);
    try {
      await updateUser(appUser.id, { name: name.trim(), phone: phone.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!appUser) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/home" className="hover:text-zinc-700 dark:hover:text-zinc-200">
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
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Nombre
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Correo electrónico
            </span>
            <input
              type="email"
              value={appUser?.email ?? ""}
              disabled
              className="cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-500 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Teléfono
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+58 412 123 4567"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={saving}
            variant="primary"
            size="lg"
          >
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
              src={user.photoURL ?? undefined}
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
