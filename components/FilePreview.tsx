/* eslint-disable @next/next/no-img-element */

interface FileItem {
  name: string;
  url: string;
  type: string;
}

export function FilePreview({ files }: { files: FileItem[] }) {
  if (!files || files.length === 0) return null;

  const images = files.filter((f) => f.type === "image");
  const docs = files.filter((f) => f.type === "document");

  return (
    <>
      {images.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {images.map((img, i) => (
            <a
              key={i}
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
            >
              <img
                src={img.url}
                alt={img.name}
                className="h-40 w-56 object-cover transition-opacity group-hover:opacity-80"
              />
            </a>
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {docs.map((doc, i) => (
            <a
              key={i}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                PDF
              </div>
              <span className="truncate">{doc.name}</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
