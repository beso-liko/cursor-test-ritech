import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";

export type AppUser = {
  clerkUserId: string;
  supabaseUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

async function findSupabaseUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  const normalized = email.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error || !data.users.length) return null;

    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match;

    if (data.users.length < 100) return null;
    page += 1;
  }
}

async function upsertProfile(
  admin: ReturnType<typeof createAdminClient>,
  row: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    clerk_id?: string;
  }
) {
  const base = {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    updated_at: new Date().toISOString(),
  };

  if (row.clerk_id) {
    const { error } = await admin
      .from("profiles")
      .upsert({ ...base, clerk_id: row.clerk_id }, { onConflict: "id" });
    if (!error) return;
  }

  await admin.from("profiles").upsert(base, { onConflict: "id" });
}

/** Resolve the signed-in Clerk user to their Supabase auth user (by email link). */
export async function getAppUser(): Promise<AppUser | null> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const admin = createAdminClient();
  const existing = await findSupabaseUserByEmail(admin, email);

  if (existing) {
    const firstName =
      (existing.user_metadata?.first_name as string | undefined) ??
      clerkUser?.firstName ??
      null;
    const lastName =
      (existing.user_metadata?.last_name as string | undefined) ??
      clerkUser?.lastName ??
      null;

    await upsertProfile(admin, {
      id: existing.id,
      clerk_id: clerkUserId,
      first_name: firstName,
      last_name: lastName,
    });

    return {
      clerkUserId,
      supabaseUserId: existing.id,
      email,
      firstName,
      lastName,
    };
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      clerk_id: clerkUserId,
      first_name: clerkUser?.firstName,
      last_name: clerkUser?.lastName,
    },
  });

  if (error || !created.user) {
    console.error("Failed to create Supabase user for Clerk account:", error);
    return null;
  }

  await upsertProfile(admin, {
    id: created.user.id,
    clerk_id: clerkUserId,
    first_name: clerkUser?.firstName ?? null,
    last_name: clerkUser?.lastName ?? null,
  });

  return {
    clerkUserId,
    supabaseUserId: created.user.id,
    email,
    firstName: clerkUser?.firstName ?? null,
    lastName: clerkUser?.lastName ?? null,
  };
}
