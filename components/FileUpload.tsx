/* eslint-disable @next/next/no-img-element */

import { ChangeEvent } from "react";
import { Button } from "@/components/Button";

export const FILE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const FILE_MAX_SIZE = 10 * 1024 * 1024;

export function validateFiles(files: File[]): string | null {
  const invalid = files.find((f) => !FILE_ALLOWED_TYPES.includes(f.type));
  if (invalid) return `Tipo de archivo no soportado: ${invalid.name}`;
  const tooBig = files.find((f) => f.size > FILE_MAX_SIZE);
  if (tooBig) return `El archivo "${tooBig.name}" supera el límite de 10 MB.`;
  return null;
}

export function handleFileInput(
  e: ChangeEvent<HTMLInputElement>,
  prev: File[],
  setFiles: (fn: (p: File[]) => File[]) => void,
): void {
  const selected = Array.from(e.target.files ?? []);
  const error = validateFiles(selected);
  if (error) {
    alert(error);
    return;
  }
  setFiles((p) => [...p, ...selected]);
}

export function FileUploadList({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  if (files.length === 0) return null;

  return (
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
              onClick={() => onRemove(i)}
              className="h-auto px-0 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Quitar
            </Button>
          </div>
        );
      })}
    </div>
  );
}
