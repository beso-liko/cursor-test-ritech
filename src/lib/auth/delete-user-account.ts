import { clerkClient } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deleteDocumentVectors,
  deleteUserVectors,
} from "@/lib/langchain/embedder";

type AdminClient = SupabaseClient;

function storagePathFromFileUrl(fileUrl: string): string | null {
  const marker = "/object/documents/";
  const markerIndex = fileUrl.indexOf(marker);
  if (markerIndex === -1) {
    const fallback = fileUrl.split("/").pop();
    return fallback ?? null;
  }

  const path = fileUrl.slice(markerIndex + marker.length);
  return path || null;
}

async function purgeUserFilesAndVectors(
  admin: AdminClient,
  supabaseUserId: string
): Promise<void> {
  const { data: documents } = await admin
    .from("documents")
    .select("id, file_url")
    .eq("user_id", supabaseUserId);

  const storagePaths: string[] = [];

  for (const doc of documents ?? []) {
    await deleteDocumentVectors(doc.id).catch((error) => {
      console.error(`Failed to delete Pinecone vectors for document ${doc.id}:`, error);
    });

    if (typeof doc.file_url === "string") {
      const path = storagePathFromFileUrl(doc.file_url);
      if (path) storagePaths.push(path);
    }
  }

  await deleteUserVectors(supabaseUserId).catch((error) => {
    console.error(`Failed to delete Pinecone vectors for user ${supabaseUserId}:`, error);
  });

  if (storagePaths.length > 0) {
    const { error } = await admin.storage.from("documents").remove(storagePaths);
    if (error) {
      console.error(`Failed to delete storage files for user ${supabaseUserId}:`, error);
    }
  }
}

/**
 * Permanently removes all user data: files, vectors, Clerk account, and Supabase auth/profile.
 */
export async function deleteUserAccount(
  admin: AdminClient,
  supabaseUserId: string,
  clerkUserId: string
): Promise<{ error?: string }> {
  await purgeUserFilesAndVectors(admin, supabaseUserId);

  try {
    const client = await clerkClient();
    await client.users.deleteUser(clerkUserId);
  } catch (error) {
    console.error("Clerk deleteUser error:", error);
    return { error: "Failed to delete authentication account" };
  }

  const { error } = await admin.auth.admin.deleteUser(supabaseUserId);
  if (error) {
    console.error("Supabase deleteUser error:", error);
    return { error: error.message };
  }

  return {};
}

/**
 * Purge Supabase-side data when the Clerk user was already deleted (webhook).
 */
export async function deleteUserAccountBySupabaseId(
  admin: AdminClient,
  supabaseUserId: string
): Promise<{ error?: string }> {
  await purgeUserFilesAndVectors(admin, supabaseUserId);

  const { error } = await admin.auth.admin.deleteUser(supabaseUserId);
  if (error) {
    console.error("Supabase deleteUser error:", error);
    return { error: error.message };
  }

  return {};
}

export async function findSupabaseUserIdByClerkId(
  admin: AdminClient,
  clerkUserId: string
): Promise<string | null> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();

  return profile?.id ?? null;
}
