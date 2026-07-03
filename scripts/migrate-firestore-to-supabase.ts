/**
 * Migration script: Firestore → Supabase
 *
 * Reads all documents from the Firebase project configured in .env.local
 * using the Firebase Web SDK (Firestore rules currently allow all reads),
 * transforms Timestamps to ISO strings, inserts rows into Supabase, and
 * migrates files from Firebase Storage to the Supabase Storage bucket
 * configured as `condominios`.
 *
 * Run with:
 *   pnpm tsx scripts/migrate-firestore-to-supabase.ts
 *
 * Environment variables required (from .env.local):
 *   NEXT_PUBLIC_FIREBASE_*  (client config is enough because rules are permissive)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SERVICE_ROLE_KEY  (optional, bypasses RLS during migration)
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY. The migration needs to bypass RLS. " +
      "Get it from Supabase Studio → Project Settings → API → service_role key."
  );
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_BUCKET = "condominios";

async function migrateStorageFile(
  firebaseUrl: string,
  targetPath: string
): Promise<string> {
  const response = await fetch(firebaseUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${firebaseUrl}: ${response.statusText}`);
  }
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(targetPath, blob, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(targetPath);

  return publicUrlData.publicUrl;
}

function isFirebaseStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("firebasestorage");
  } catch {
    return false;
  }
}

async function migrateFilesInDocuments(
  table: string,
  filesField: string,
  pathPrefix: (row: Record<string, unknown>) => string
) {
  console.log(`Migrating files for ${table}...`);
  const { data, error } = await supabase.from(table).select(`id, ${filesField}`);
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return;

  for (const row of rows) {
    const rawFiles = row[filesField];
    const files = (Array.isArray(rawFiles) ? rawFiles : []) as Array<{
      name: string;
      url: string;
      type: string;
    }>;
    if (!Array.isArray(files) || files.length === 0) continue;

    let changed = false;
    const updatedFiles = [];
    for (const file of files) {
      if (isFirebaseStorageUrl(file.url)) {
        const targetPath = `${pathPrefix(row)}/${file.name}`;
        try {
          file.url = await migrateStorageFile(file.url, targetPath);
          changed = true;
        } catch (e) {
          console.warn(`  Failed to migrate file ${file.name} in ${table}/${row.id}:`, e);
        }
      }
      updatedFiles.push(file);
    }

    if (changed) {
      const { error: updateError } = await supabase
        .from(table)
        .update({ [filesField]: updatedFiles })
        .eq("id", row.id as string);
      if (updateError) console.warn(`  Failed to update ${table}/${row.id}:`, updateError);
    }
  }

  console.log(`  ${table}: file migration done`);
}

async function migratePaymentProofs() {
  console.log("Migrating payment proofs...");
  const { data: rows, error } = await supabase
    .from("expense_entries")
    .select("id, payment_proof_url");
  if (error) throw error;
  if (!rows || rows.length === 0) return;

  for (const row of rows) {
    const url = row.payment_proof_url as string | null;
    if (!url || !isFirebaseStorageUrl(url)) continue;

    const targetPath = `payment_proofs/${row.id}/${url.split("?")[0].split("/").pop() ?? "proof"}`;
    try {
      const newUrl = await migrateStorageFile(url, targetPath);
      const { error: updateError } = await supabase
        .from("expense_entries")
        .update({ payment_proof_url: newUrl })
        .eq("id", row.id as string);
      if (updateError) throw updateError;
    } catch (e) {
      console.warn(`  Failed to migrate payment proof ${row.id}:`, e);
    }
  }

  console.log("  expense_entries: payment proof migration done");
}

function toISO(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function cleanDoc<T extends Record<string, unknown>>(
  doc: T,
  idField: keyof T = "id"
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === idField) {
      cleaned[key] = value;
      continue;
    }
    if (value instanceof Timestamp) {
      cleaned[key] = value.toDate().toISOString();
    } else if (value === undefined) {
      cleaned[key] = null;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

async function migrateCollection(
  firestoreCollection: string,
  supabaseTable: string,
  transform?: (doc: Record<string, unknown>) => Record<string, unknown>
) {
  console.log(`Migrating ${firestoreCollection}...`);
  const snapshot = await getDocs(collection(db, firestoreCollection));
  const rows = snapshot.docs.map((d) => {
    const data = cleanDoc({ id: d.id, ...d.data() });
    return transform ? transform(data) : data;
  });

  if (rows.length === 0) {
    console.log(`  ${firestoreCollection}: no documents`);
    return;
  }

  const { error } = await supabase.from(supabaseTable).upsert(rows, {
    onConflict: "id",
  });

  if (error) {
    console.error(`  Error migrating ${firestoreCollection}:`, error);
    throw error;
  }

  console.log(`  ${firestoreCollection}: migrated ${rows.length} documents`);
}

async function migrateUsers() {
  await migrateCollection("users", "users", (doc) => {
    const { photoURL, ...rest } = doc;
    return {
      ...rest,
      photo_url: photoURL ?? null,
    };
  });
}

async function migrateCondominiums() {
  await migrateCollection("condominiums", "condominiums");
}

async function migrateCondominiumRoles() {
  await migrateCollection("condominium_roles", "condominium_roles", (doc) => ({
    ...doc,
    user: doc.user || null,
    invited_email: doc.invited_email || null,
    invited_by: doc.invited_by || null,
    token: doc.token || null,
    expires_at: toISO(doc.expires_at),
  }));
}

async function migrateBuildings() {
  await migrateCollection("buildings", "buildings");
}

async function migrateUnits() {
  await migrateCollection("units", "units", (doc) => ({
    ...doc,
    owner: doc.owner || null,
    owner_status: doc.owner_status || null,
    claim_blocked_until: toISO(doc.claim_blocked_until),
  }));
}

async function migrateExpenses() {
  await migrateCollection("expenses", "expenses", (doc) => ({
    ...doc,
    condominium: doc.condominium || null,
    building: doc.building || null,
    description: doc.description || null,
    period_start: toISO(doc.period_start),
    period_end: toISO(doc.period_end),
  }));
}

async function migrateExpenseEntries() {
  await migrateCollection("expense_entries", "expense_entries", (doc) => ({
    ...doc,
    paid_at: toISO(doc.paid_at),
    payment_method_id: doc.payment_method_id || null,
    payment_reference: doc.payment_reference || null,
    payment_proof_url: doc.payment_proof_url || null,
    notes: doc.notes || null,
    reported_by: doc.reported_by || null,
    reported_at: toISO(doc.reported_at),
    validated_by: doc.validated_by || null,
    validated_at: toISO(doc.validated_at),
  }));
}

async function migrateAnnouncements() {
  await migrateCollection("announcements", "announcements");
}

async function migratePaymentMethods() {
  await migrateCollection("payment_methods", "payment_methods", (doc) => ({
    ...doc,
    holder_name: doc.holder_name || null,
    bank_name: doc.bank_name || null,
    account_number: doc.account_number || null,
    routing_number: doc.routing_number || null,
    phone: doc.phone || null,
    email: doc.email || null,
    identification: doc.identification || null,
    notes: doc.notes || null,
  }));
}

async function migrateComplaints() {
  await migrateCollection("complaints", "complaints", (doc) => ({
    ...doc,
    resolution_notes: doc.resolution_notes || null,
    resolved_by: doc.resolved_by || null,
    resolved_at: toISO(doc.resolved_at),
  }));
}

async function main() {
  console.log("Starting Firestore → Supabase migration\n");

  await migrateUsers();
  await migrateCondominiums();
  await migrateCondominiumRoles();
  await migrateBuildings();
  await migrateUnits();
  await migrateExpenses();
  await migrateExpenseEntries();
  await migrateAnnouncements();
  await migratePaymentMethods();
  await migrateComplaints();

  await migrateFilesInDocuments(
    "announcements",
    "files",
    (row) => `announcements/${row.condominium}/${row.id}`
  );
  await migrateFilesInDocuments(
    "complaints",
    "files",
    (row) => `complaints/${row.condominium}/${row.id}`
  );
  await migratePaymentProofs();

  console.log("\nMigration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
