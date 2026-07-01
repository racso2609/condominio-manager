import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  where,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/firebase";
import { Announcement, AnnouncementFile } from "@/lib/types";

const COLLECTION = "announcements";

export async function createAnnouncement(data: {
  condominium: string;
  title: string;
  content: string;
  author: string;
  files?: File[];
}): Promise<Announcement> {
  const now = Timestamp.now();
  const ref_doc = doc(collection(db, COLLECTION));
  const announcementData = {
    condominium: data.condominium,
    title: data.title,
    content: data.content,
    author: data.author,
    files: [] as AnnouncementFile[],
    created_at: now,
    updated_at: now,
  };
  await setDoc(ref_doc, announcementData);

  if (data.files && data.files.length > 0) {
    const uploaded: AnnouncementFile[] = [];
    for (const file of data.files) {
      const storageRef = ref(
        storage,
        `announcements/${data.condominium}/${ref_doc.id}/${file.name}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploaded.push({
        name: file.name,
        url,
        type: file.type.startsWith("image/") ? "image" : "document",
      });
    }
    await updateDoc(ref_doc, {
      files: uploaded,
      updated_at: Timestamp.now(),
    });
    announcementData.files = uploaded;
  }

  return { id: ref_doc.id, ...announcementData };
}

export async function getAnnouncementsByCondominium(
  condominiumId: string
): Promise<Announcement[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("condominium", "==", condominiumId),
      orderBy("created_at", "desc")
    )
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement);
}

export async function getAnnouncement(
  id: string
): Promise<Announcement | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Announcement;
}

export async function deleteAnnouncement(
  id: string,
  condominiumId: string
): Promise<void> {
  const announcement = await getAnnouncement(id);
  if (announcement?.files) {
    for (const f of announcement.files) {
      try {
        const storageRef = ref(
          storage,
          `announcements/${condominiumId}/${id}/${f.name}`
        );
        await deleteObject(storageRef);
      } catch {
        // file may not exist
      }
    }
  }
  await deleteDoc(doc(db, COLLECTION, id));
}
