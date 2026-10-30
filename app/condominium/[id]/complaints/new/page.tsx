"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { useCondominium } from "@/lib/queries/useCondominium";
import { useCondominiumPermissions } from "@/hooks/useCondominiumPermissions";
import { useCreateComplaint } from "@/lib/mutations/useComplaintMutations";
import { FormSkeleton } from "@/components/skeleton";
import { PermissionDenied } from "@/components/PermissionDenied";
import { FormField, Input, Textarea } from "@/components/Form";
import { handleFileInput, FileUploadList } from "@/components/FileUpload";

export default function NewComplaintPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);
  const {
    userRole,
    role,
    isLoading: roleLoading,
  } = useCondominiumPermissions(condominiumId);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const { mutate: createComplaint, isPending: saving } = useCreateComplaint();

  const canCreate = role !== "none" && !!userRole?.user;

  useEffect(() => {
    if (condominiumLoading || roleLoading) return;
    if (condominium === null) {
      router.replace("/home");
      return;
    }
    if (role === "none") {
      router.replace("/home");
    }
  }, [condominiumLoading, roleLoading, condominium, role, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileInput(e, files, setFiles);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser || !canCreate) return;

    createComplaint(
      {
        condominium: condominiumId,
        title: title.trim(),
        content: content.trim(),
        author: appUser.id,
        files: files.length > 0 ? files : undefined,
      },
      {
        onSuccess: (complaint) => {
          router.push(
            `/condominium/${condominiumId}/complaints?id=${complaint.id}`
          );
        },
        onError: () => alert("Error al registrar la queja"),
      }
    );
  };

  const loading = condominiumLoading || roleLoading;

  if (loading) {
    return <FormSkeleton titleWidth="w-40" inputCount={3} />;
  }

  if (!canCreate) {
    return (
      <PermissionDenied message="No tienes permisos para crear quejas." />
    );
  }

  if (!condominium) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: condominium.name, href: `/condominium/${condominium.id}` },
          {
            label: "Quejas",
            href: `/condominium/${condominium.id}/complaints`,
          },
          { label: "Nueva" },
        ]}
      />

      <PageHeader title="Nueva queja" subtitle={condominium.name} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <FormField label="Título">
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ej. Fuga de agua en el pasillo"
            />
          </FormField>

          <FormField label="Descripción">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={6}
              placeholder="Describe el problema con el mayor detalle posible..."
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
            {saving ? "Registrando..." : "Registrar queja"}
          </Button>
          <Button
            href={`/condominium/${condominiumId}/complaints`}
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
