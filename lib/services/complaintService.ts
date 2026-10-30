import { supabase } from "@/lib/supabase";
import { generateStorageFileName } from "@/lib/utils/storage";
import { Complaint, ComplaintFile, ComplaintStatus } from "@/lib/types";
import { generateId } from "@/lib/utils/id";

const TABLE = "complaints";
const STORAGE_BUCKET = "condominios";

async function uploadFiles(
  files: File[],
  pathPrefix: string
): Promise<ComplaintFile[]> {
  const uploaded: ComplaintFile[] = [];

  for (const file of files) {
    const path = `${pathPrefix}/${generateStorageFileName(file.name)}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    uploaded.push({
      name: file.name,
      url: publicUrlData.publicUrl,
      type: file.type.startsWith("image/") ? "image" : "document",
    });
  }

  return uploaded;
}

function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.slice(index + marker.length);
}

async function deleteFiles(files: ComplaintFile[]): Promise<void> {
  const paths = files
    .map((f) => getStoragePathFromPublicUrl(f.url))
    .filter((p): p is string => p !== null);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  if (error) {
    console.warn("Failed to delete some complaint files:", error);
  }
}

export async function createComplaint(data: {
  condominium: string;
  title: string;
  content: string;
  author: string;
  files?: File[];
}): Promise<Complaint> {
  const now = new Date().toISOString();
  const id = generateId();

  // Upload files first so the complaint is only created if uploads succeed.
  const uploadedFiles =
    data.files && data.files.length > 0
      ? await uploadFiles(data.files, `complaints/${data.condominium}/${id}`)
      : [];

  const complaintData = {
    id,
    condominium: data.condominium,
    title: data.title,
    content: data.content,
    author: data.author,
    files: uploadedFiles,
    status: "pending" as ComplaintStatus,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from(TABLE).insert(complaintData);
  if (error) {
    // Best-effort cleanup of uploaded files if the complaint insert fails.
    if (uploadedFiles.length > 0) {
      await deleteFiles(uploadedFiles);
    }
    throw error;
  }

  return complaintData as Complaint;
}

export async function getComplaintsByCondominium(
  condominiumId: string
): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("condominium", condominiumId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Complaint[];
}

export async function getComplaintsByAuthor(
  condominiumId: string,
  authorId: string
): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("condominium", condominiumId)
    .eq("author", authorId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Complaint[];
}

export async function getComplaint(id: string): Promise<Complaint | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Complaint;
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  resolverId?: string,
  resolutionNotes?: string
): Promise<void> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status,
    updated_at: now,
  };

  if (status === "resolved") {
    payload.resolved_by = resolverId ?? null;
    payload.resolved_at = now;
    payload.resolution_notes = resolutionNotes?.trim() ?? null;
  } else {
    payload.resolved_by = null;
    payload.resolved_at = null;
    payload.resolution_notes = null;
  }

  const { error } = await supabase.from(TABLE).update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteComplaint(id: string): Promise<string> {
  const complaint = await getComplaint(id);
  if (complaint?.files && complaint.files.length > 0) {
    await deleteFiles(complaint.files);
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  return id;
}
