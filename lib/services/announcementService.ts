import { supabase } from "@/lib/supabase";
import { generateStorageFileName } from "@/lib/utils/storage";
import { Announcement, AnnouncementFile } from "@/lib/types";

const TABLE = "announcements";
const STORAGE_BUCKET = "condominios";

function generateId(): string {
  return crypto.randomUUID();
}

async function uploadFiles(
  files: File[],
  pathPrefix: string
): Promise<AnnouncementFile[]> {
  const uploaded: AnnouncementFile[] = [];

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

async function deleteFiles(files: AnnouncementFile[]): Promise<void> {
  const paths = files
    .map((f) => getStoragePathFromPublicUrl(f.url))
    .filter((p): p is string => p !== null);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  if (error) {
    // file may not exist
    console.warn("Failed to delete some announcement files:", error);
  }
}

export async function createAnnouncement(data: {
  condominium: string;
  title: string;
  content: string;
  author: string;
  files?: File[];
}): Promise<Announcement> {
  const now = new Date().toISOString();
  const id = generateId();

  // Upload files first so the post is only created if uploads succeed.
  const uploadedFiles =
    data.files && data.files.length > 0
      ? await uploadFiles(data.files, `announcements/${data.condominium}/${id}`)
      : [];

  const announcementData = {
    id,
    condominium: data.condominium,
    title: data.title,
    content: data.content,
    author: data.author,
    files: uploadedFiles,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from(TABLE).insert(announcementData);
  if (error) {
    // Best-effort cleanup of uploaded files if the post insert fails.
    if (uploadedFiles.length > 0) {
      await deleteFiles(uploadedFiles);
    }
    throw error;
  }

  return announcementData as Announcement;
}

export async function getAnnouncementsByCondominium(
  condominiumId: string
): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("condominium", condominiumId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export async function getAnnouncement(
  id: string
): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Announcement;
}

export async function deleteAnnouncement(id: string): Promise<string> {
  const announcement = await getAnnouncement(id);
  if (announcement?.files && announcement.files.length > 0) {
    await deleteFiles(announcement.files);
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  return id;
}
