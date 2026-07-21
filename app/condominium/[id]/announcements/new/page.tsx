"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { useCreateAnnouncement } from "@/lib/mutations/useAnnouncementMutations";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function NewAnnouncementPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const { mutate: createAnnouncement, isPending: saving } =
    useCreateAnnouncement();

  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const invalid = selected.find((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalid) {
      alert(`Tipo de archivo no soportado: ${invalid.name}`);
      return;
    }
    const tooBig = selected.find((f) => f.size > MAX_FILE_SIZE);
    if (tooBig) {
      alert(`El archivo "${tooBig.name}" supera el límite de 10 MB.`);
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser || !params.id) return;

    createAnnouncement(
      {
        condominium: params.id as string,
        title: title.trim(),
        content: content.trim(),
        author: appUser.id,
        files: files.length > 0 ? files : undefined,
      },
      {
        onSuccess: (announcement) => {
          router.push(
            `/condominium/${params.id}/announcements?id=${announcement.id}`
          );
        },
        onError: () => alert("Error al publicar anuncio"),
      }
    );
  };

  if (!isAdminOrManager) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <p className="text-zinc-500 dark:text-zinc-400">
          No tienes permisos para crear anuncios.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: "Condominio", href: `/condominium/${params.id}` },
          {
            label: "Anuncios",
            href: `/condominium/${params.id}/announcements`,
          },
          { label: "Nuevo" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Nuevo anuncio
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Título
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Contenido
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={6}
              className="resize-y rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Archivos (imágenes, PDFs, documentos · máx 10 MB c/u)
            </span>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileChange}
              className="text-sm text-zinc-500 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700"
            />
          </label>

          {files.length > 0 && (
            <div className="flex flex-col gap-2">
              {files.map((f, i) => {
                const isImage = f.type.startsWith("image/");
                const previewUrl = isImage ? URL.createObjectURL(f) : null;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg bg-zinc-50 px-4 py-2 dark:bg-zinc-900"
                  >
                    {isImage && previewUrl ? (
                      <img
                        src={previewUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-xs font-bold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                        PDF
                      </div>
                    )}
                    <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                      {f.name}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {(f.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(i)}
                      className="h-auto px-0 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Quitar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={saving || !title.trim() || !content.trim()}
            variant="primary"
            size="lg"
          >
            {saving ? "Publicando..." : "Publicar anuncio"}
          </Button>
          <Button
            href={`/condominium/${params.id}/announcements`}
            variant="secondary"
            size="lg"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
