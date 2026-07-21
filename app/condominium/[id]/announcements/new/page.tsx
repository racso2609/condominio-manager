"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { useCreateAnnouncement } from "@/lib/mutations/useAnnouncementMutations";
import { PermissionDenied } from "@/components/PermissionDenied";
import { FormField, Input, Textarea } from "@/components/Form";
import { handleFileInput, FileUploadList } from "@/components/FileUpload";

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
    handleFileInput(e, files, setFiles);
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
      <PermissionDenied message="No tienes permisos para crear anuncios." />
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

      <PageHeader title="Nuevo anuncio" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <FormField label="Título">
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Contenido">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={6}
            />
          </FormField>

          <FormField label="Archivos (imágenes, PDFs, documentos · máx 10 MB c/u)">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileChange}
              className="text-sm text-zinc-500 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700"
            />
          </FormField>

          <FileUploadList files={files} onRemove={removeFile} />
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
