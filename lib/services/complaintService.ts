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
import { Complaint, ComplaintFile, ComplaintStatus } from "@/lib/types";

const COLLECTION = "complaints";

export async function createComplaint(data: {
  condominium: string;
  title: string;
  content: string;
  author: string;
  files?: File[];
}): Promise<Complaint> {
  const now = Timestamp.now();
  const ref_doc = doc(collection(db, COLLECTION));
  const complaintData = {
    condominium: data.condominium,
    title: data.title,
    content: data.content,
    author: data.author,
    files: [] as ComplaintFile[],
    status: "pending" as ComplaintStatus,
    created_at: now,
    updated_at: now,
  };
  await setDoc(ref_doc, complaintData);

  if (data.files && data.files.length > 0) {
    const uploaded: ComplaintFile[] = [];
    for (const file of data.files) {
      const storageRef = ref(
        storage,
        `complaints/${data.condominium}/${ref_doc.id}/${file.name}`
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
    complaintData.files = uploaded;
  }

  return { id: ref_doc.id, ...complaintData };
}

export async function getComplaintsByCondominium(
  condominiumId: string
): Promise<Complaint[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("condominium", "==", condominiumId),
      orderBy("created_at", "desc")
    )
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Complaint);
}

export async function getComplaintsByAuthor(
  condominiumId: string,
  authorId: string
): Promise<Complaint[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("condominium", "==", condominiumId),
      where("author", "==", authorId),
      orderBy("created_at", "desc")
    )
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Complaint);
}

export async function getComplaint(id: string): Promise<Complaint | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Complaint;
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  resolverId?: string,
  resolutionNotes?: string
): Promise<void> {
  const payload: Record<string, unknown> = {
    status,
    updated_at: Timestamp.now(),
  };

  if (status === "resolved") {
    payload.resolved_by = resolverId ?? null;
    payload.resolved_at = Timestamp.now();
    payload.resolution_notes = resolutionNotes?.trim() ?? null;
  } else {
    payload.resolved_by = null;
    payload.resolved_at = null;
    payload.resolution_notes = null;
  }

  await updateDoc(doc(db, COLLECTION, id), payload);
}

export async function deleteComplaint(
  id: string,
  condominiumId: string
): Promise<void> {
  const complaint = await getComplaint(id);
  if (complaint?.files) {
    for (const f of complaint.files) {
      try {
        const storageRef = ref(
          storage,
          `complaints/${condominiumId}/${id}/${f.name}`
        );
        await deleteObject(storageRef);
      } catch {
        // file may not exist
      }
    }
  }
  await deleteDoc(doc(db, COLLECTION, id));
}
