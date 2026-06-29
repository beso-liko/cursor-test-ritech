import { auth, currentUser } from "@clerk/nextjs/server";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

export type AppUser = {
  clerkUserId: string;
  supabaseUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type AdminClient = ReturnType<typeof createAdminClient>;

function getClerkEmails(
  clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>
): string[] {
  const emails = clerkUser.emailAddresses
    .map((entry) => entry.emailAddress)
    .filter(Boolean) as string[];

  const primary = clerkUser.primaryEmailAddress?.emailAddress;
  if (primary && !emails.includes(primary)) {
    emails.unshift(primary);
  }

  return [...new Set(emails.map((value) => value.toLowerCase()))];
}

function collectSupabaseUserEmails(user: User): Set<string> {
  const emails = new Set<string>();
  if (user.email) emails.add(user.email.toLowerCase());

  for (const identity of user.identities ?? []) {
    const value = identity.identity_data?.email;
    if (typeof value === "string" && value) {
      emails.add(value.toLowerCase());
    }
  }

  return emails;
}

async function listAllSupabaseUsers(admin: AdminClient): Promise<User[]> {
  const all: User[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error || !data.users.length) break;

    all.push(...data.users);
    if (data.users.length < 100) break;
    page += 1;
  }

  return all;
}

async function countUserDocuments(admin: AdminClient, userId: string): Promise<number> {
  const { count } = await admin
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return count ?? 0;
}

async function findSupabaseMatches(
  admin: AdminClient,
  clerkUserId: string,
  clerkEmails: string[]
): Promise<User[]> {
  const normalizedClerkEmails = new Set(clerkEmails.map((email) => email.toLowerCase()));
  const allUsers = await listAllSupabaseUsers(admin);

  return allUsers.filter((user) => {
    if (user.user_metadata?.clerk_id === clerkUserId) return true;

    for (const email of collectSupabaseUserEmails(user)) {
      if (normalizedClerkEmails.has(email)) return true;
    }

    return false;
  });
}

async function pickBestSupabaseUser(
  admin: AdminClient,
  matches: User[]
): Promise<User> {
  if (matches.length === 1) return matches[0];

  let best = matches[0];
  let bestCount = -1;

  for (const user of matches) {
    const count = await countUserDocuments(admin, user.id);
    if (count > bestCount) {
      bestCount = count;
      best = user;
    }
  }

  return best;
}

async function findProfileByClerkId(admin: AdminClient, clerkUserId: string) {
  const { data } = await admin
    .from("profiles")
    .select("id, first_name, last_name, clerk_id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();

  return data;
}

async function upsertProfile(
  admin: AdminClient,
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
    await admin
      .from("profiles")
      .update({ clerk_id: null })
      .eq("clerk_id", row.clerk_id)
      .neq("id", row.id);

    const { error } = await admin
      .from("profiles")
      .upsert({ ...base, clerk_id: row.clerk_id }, { onConflict: "id" });

    if (!error) return;
  }

  await admin.from("profiles").upsert(base, { onConflict: "id" });
}

function buildAppUser(
  clerkUserId: string,
  supabaseUser: User,
  clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
  profile?: { first_name: string | null; last_name: string | null } | null
): AppUser {
  const email =
    supabaseUser.email ??
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";

  return {
    clerkUserId,
    supabaseUserId: supabaseUser.id,
    email,
    firstName:
      profile?.first_name ??
      (supabaseUser.user_metadata?.first_name as string | undefined) ??
      clerkUser.firstName ??
      null,
    lastName:
      profile?.last_name ??
      (supabaseUser.user_metadata?.last_name as string | undefined) ??
      clerkUser.lastName ??
      null,
  };
}

async function linkSupabaseUser(
  admin: AdminClient,
  clerkUserId: string,
  supabaseUser: User,
  clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>
): Promise<AppUser> {
  const appUser = buildAppUser(clerkUserId, supabaseUser, clerkUser);

  await upsertProfile(admin, {
    id: supabaseUser.id,
    clerk_id: clerkUserId,
    first_name: appUser.firstName,
    last_name: appUser.lastName,
  });

  if (supabaseUser.user_metadata?.clerk_id !== clerkUserId) {
    await admin.auth.admin.updateUserById(supabaseUser.id, {
      user_metadata: {
        ...supabaseUser.user_metadata,
        clerk_id: clerkUserId,
        first_name: appUser.firstName,
        last_name: appUser.lastName,
      },
    });
  }

  return appUser;
}

/** Resolve the signed-in Clerk user to their Supabase auth user. */
export async function getAppUser(): Promise<AppUser | null> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const clerkEmails = getClerkEmails(clerkUser);
  if (clerkEmails.length === 0) return null;

  const admin = createAdminClient();
  const linkedProfile = await findProfileByClerkId(admin, clerkUserId);
  const matches = await findSupabaseMatches(admin, clerkUserId, clerkEmails);

  if (matches.length > 0) {
    const best = await pickBestSupabaseUser(admin, matches);
    return linkSupabaseUser(admin, clerkUserId, best, clerkUser);
  }

  if (linkedProfile) {
    const { data } = await admin.auth.admin.getUserById(linkedProfile.id);
    if (data.user) {
      return linkSupabaseUser(admin, clerkUserId, data.user, clerkUser);
    }
  }

  const primaryEmail = clerkEmails[0];
  const { data: created, error } = await admin.auth.admin.createUser({
    email: primaryEmail,
    email_confirm: true,
    user_metadata: {
      clerk_id: clerkUserId,
      first_name: clerkUser.firstName,
      last_name: clerkUser.lastName,
    },
  });

  if (error || !created.user) {
    const retryMatches = await findSupabaseMatches(admin, clerkUserId, clerkEmails);
    if (retryMatches.length > 0) {
      const best = await pickBestSupabaseUser(admin, retryMatches);
      return linkSupabaseUser(admin, clerkUserId, best, clerkUser);
    }

    console.error("Failed to create Supabase user for Clerk account:", error);
    return null;
  }

  return linkSupabaseUser(admin, clerkUserId, created.user, clerkUser);
}
