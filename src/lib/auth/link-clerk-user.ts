import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

export type AppUser = {
  clerkUserId: string;
  supabaseUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export type ClerkIdentity = {
  clerkUserId: string;
  emails: string[];
  firstName: string | null;
  lastName: string | null;
};

type AdminClient = ReturnType<typeof createAdminClient>;

function normalizeEmails(emails: string[]): string[] {
  return [...new Set(emails.map((value) => value.trim().toLowerCase()).filter(Boolean))];
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

  const metaEmail = user.user_metadata?.email;
  if (typeof metaEmail === "string" && metaEmail) {
    emails.add(metaEmail.toLowerCase());
  }

  return emails;
}

async function listAllSupabaseUsers(admin: AdminClient): Promise<User[]> {
  const all: User[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      console.error("listUsers failed while linking Clerk user:", error);
      break;
    }
    if (!data.users.length) break;

    all.push(...data.users);
    if (data.users.length < 100) break;
    page += 1;
  }

  return all;
}

async function scoreUserContent(admin: AdminClient, userId: string): Promise<number> {
  const [docs, groups, quizzes] = await Promise.all([
    admin.from("documents").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin
      .from("document_groups")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin.from("quiz_results").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return (docs.count ?? 0) + (groups.count ?? 0) + (quizzes.count ?? 0);
}

async function findSupabaseMatches(
  admin: AdminClient,
  clerkUserId: string,
  clerkEmails: string[],
  profileEmailsByUserId: Map<string, string>
): Promise<User[]> {
  const normalizedClerkEmails = new Set(normalizeEmails(clerkEmails));
  const allUsers = await listAllSupabaseUsers(admin);

  return allUsers.filter((user) => {
    if (user.user_metadata?.clerk_id === clerkUserId) return true;

    const profileEmail = profileEmailsByUserId.get(user.id);
    if (profileEmail && normalizedClerkEmails.has(profileEmail.toLowerCase())) {
      return true;
    }

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
  let bestScore = -1;

  for (const user of matches) {
    const score = await scoreUserContent(admin, user.id);
    if (score > bestScore) {
      bestScore = score;
      best = user;
    }
  }

  return best;
}

async function loadProfileEmailMap(admin: AdminClient): Promise<Map<string, string>> {
  const { data } = await admin.from("profiles").select("id, email");
  const map = new Map<string, string>();

  for (const row of data ?? []) {
    if (typeof row.email === "string" && row.email) {
      map.set(row.id, row.email.toLowerCase());
    }
  }

  return map;
}

async function findFirstProfile(
  admin: AdminClient,
  column: "email" | "clerk_id",
  value: string
) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, first_name, last_name, clerk_id, email")
    .eq(column, value)
    .limit(1);

  if (error) {
    console.error(`profiles lookup by ${column} failed:`, error);
    return null;
  }

  return data?.[0] ?? null;
}

async function findSupabaseUserByProfileEmail(
  admin: AdminClient,
  clerkEmails: string[]
): Promise<User | null> {
  for (const email of normalizeEmails(clerkEmails)) {
    const profile = await findFirstProfile(admin, "email", email);
    if (!profile) continue;

    const { data } = await admin.auth.admin.getUserById(profile.id);
    if (data.user) return data.user;
  }

  return null;
}

async function findProfileByClerkId(admin: AdminClient, clerkUserId: string) {
  return findFirstProfile(admin, "clerk_id", clerkUserId);
}

async function findAuthUserByEmail(
  admin: AdminClient,
  email: string
): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }

  const res = await fetch(
    `${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
    }
  );

  if (!res.ok) {
    console.error(
      "Auth admin lookup by email failed:",
      res.status,
      await res.text()
    );
    return null;
  }

  const json = (await res.json()) as { users?: User[] } | User[];
  const users = Array.isArray(json) ? json : json.users ?? [];
  const normalized = email.toLowerCase();
  return (
    users.find((user) => collectSupabaseUserEmails(user).has(normalized)) ?? null
  );
}

async function getUserFromProfileId(
  admin: AdminClient,
  profileId: string
): Promise<User | null> {
  const { data } = await admin.auth.admin.getUserById(profileId);
  return data.user ?? null;
}

async function upsertProfile(
  admin: AdminClient,
  row: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    clerk_id?: string;
  }
) {
  const base = {
    id: row.id,
    email: row.email?.toLowerCase() ?? null,
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
  identity: ClerkIdentity,
  profile?: { first_name: string | null; last_name: string | null } | null
): AppUser {
  const email =
    supabaseUser.email ??
    identity.emails[0] ??
    "";

  return {
    clerkUserId,
    supabaseUserId: supabaseUser.id,
    email,
    firstName:
      profile?.first_name ??
      (supabaseUser.user_metadata?.first_name as string | undefined) ??
      identity.firstName ??
      null,
    lastName:
      profile?.last_name ??
      (supabaseUser.user_metadata?.last_name as string | undefined) ??
      identity.lastName ??
      null,
  };
}

async function linkSupabaseUser(
  admin: AdminClient,
  identity: ClerkIdentity,
  supabaseUser: User
): Promise<AppUser> {
  const appUser = buildAppUser(identity.clerkUserId, supabaseUser, identity);

  await upsertProfile(admin, {
    id: supabaseUser.id,
    email: appUser.email || null,
    clerk_id: identity.clerkUserId,
    first_name: appUser.firstName,
    last_name: appUser.lastName,
  });

  if (supabaseUser.user_metadata?.clerk_id !== identity.clerkUserId) {
    await admin.auth.admin.updateUserById(supabaseUser.id, {
      user_metadata: {
        ...supabaseUser.user_metadata,
        clerk_id: identity.clerkUserId,
        first_name: appUser.firstName,
        last_name: appUser.lastName,
      },
    });
  }

  return appUser;
}

/** Link a Clerk account to the best matching legacy Supabase user (preserves documents). */
export async function linkClerkToSupabase(
  identity: ClerkIdentity
): Promise<AppUser | null> {
  const clerkEmails = normalizeEmails(identity.emails);
  if (clerkEmails.length === 0) return null;

  const admin = createAdminClient();

  const linkedProfile = await findProfileByClerkId(admin, identity.clerkUserId);
  if (linkedProfile) {
    const existing = await getUserFromProfileId(admin, linkedProfile.id);
    if (existing) return linkSupabaseUser(admin, identity, existing);
  }

  const profileMatch = await findSupabaseUserByProfileEmail(admin, clerkEmails);
  if (profileMatch) {
    return linkSupabaseUser(admin, identity, profileMatch);
  }

  for (const email of clerkEmails) {
    const byEmail = await findAuthUserByEmail(admin, email);
    if (byEmail) return linkSupabaseUser(admin, identity, byEmail);
  }

  const profileEmails = await loadProfileEmailMap(admin);
  const matches = await findSupabaseMatches(
    admin,
    identity.clerkUserId,
    clerkEmails,
    profileEmails
  );

  if (matches.length > 0) {
    const best = await pickBestSupabaseUser(admin, matches);
    return linkSupabaseUser(admin, identity, best);
  }

  const primaryEmail = clerkEmails[0];
  const { data: created, error } = await admin.auth.admin.createUser({
    email: primaryEmail,
    email_confirm: true,
    user_metadata: {
      clerk_id: identity.clerkUserId,
      first_name: identity.firstName,
      last_name: identity.lastName,
    },
  });

  if (!error && created.user) {
    return linkSupabaseUser(admin, identity, created.user);
  }

  const existingAfterCreate = await findAuthUserByEmail(admin, primaryEmail);
  if (existingAfterCreate) {
    return linkSupabaseUser(admin, identity, existingAfterCreate);
  }

  const retryMatches = await findSupabaseMatches(
    admin,
    identity.clerkUserId,
    clerkEmails,
    profileEmails
  );
  if (retryMatches.length > 0) {
    const best = await pickBestSupabaseUser(admin, retryMatches);
    return linkSupabaseUser(admin, identity, best);
  }

  console.error("Failed to create Supabase user for Clerk account:", error);
  return null;
}
