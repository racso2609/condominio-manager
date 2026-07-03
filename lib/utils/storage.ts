export function generateStorageFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);

  // Keep only safe characters and derive a clean extension
  const sanitized = originalName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .toLowerCase();

  const lastDot = sanitized.lastIndexOf(".");
  const extension = lastDot > 0 ? sanitized.slice(lastDot) : "";
  const base = lastDot > 0 ? sanitized.slice(0, lastDot) : sanitized;
  const shortBase = base.slice(0, 40);

  return `${timestamp}-${random}-${shortBase}${extension || ""}`;
}
