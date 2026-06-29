/**
 * Proactively link every Clerk user to their legacy Supabase account by email.
 * Run after repair-clerk-account-links.mjs and applying migrations 011 + 012.
 *
 * Usage: node scripts/bulk-link-clerk-users.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey || !clerkSecretKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CLERK_SECRET_KEY"
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalizeEmails(emails) {
  return [...new Set(emails.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

async function listClerkUsers() {
  const users = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await fetch(
      `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`,
      {
        headers: { Authorization: `Bearer ${clerkSecretKey}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Clerk API error ${response.status}: ${await response.text()}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    users.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return users;
}

async function scoreUserContent(userId) {
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

async function findSupabaseUserByEmail(email) {
  const normalized = email.toLowerCase();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, clerk_id, first_name, last_name")
    .eq("email", normalized)
    .maybeSingle();

  if (profile) {
    const { data } = await admin.auth.admin.getUserById(profile.id);
    if (data.user) return { user: data.user, profile };
  }

  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error || !data.users.length) break;

    for (const user of data.users) {
      if (user.email?.toLowerCase() === normalized) {
        const { data: profileRow } = await admin
          .from("profiles")
          .select("id, email, clerk_id, first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();
        return { user, profile: profileRow };
      }

      for (const identity of user.identities ?? []) {
        const identityEmail = identity.identity_data?.email;
        if (
          typeof identityEmail === "string" &&
          identityEmail.toLowerCase() === normalized
        ) {
          const { data: profileRow } = await admin
            .from("profiles")
            .select("id, email, clerk_id, first_name, last_name")
            .eq("id", user.id)
            .maybeSingle();
          return { user, profile: profileRow };
        }
      }
    }

    if (data.users.length < 100) break;
    page += 1;
  }

  return null;
}

async function linkPair(clerkUser, supabaseUser, profile, primaryEmail) {
  const clerkUserId = clerkUser.id;
  const firstName =
    profile?.first_name ??
    clerkUser.first_name ??
    supabaseUser.user_metadata?.first_name ??
    null;
  const lastName =
    profile?.last_name ??
    clerkUser.last_name ??
    supabaseUser.user_metadata?.last_name ??
    null;

  await admin
    .from("profiles")
    .update({ clerk_id: null })
    .eq("clerk_id", clerkUserId)
    .neq("id", supabaseUser.id);

  await admin.from("profiles").upsert(
    {
      id: supabaseUser.id,
      email: primaryEmail,
      clerk_id: clerkUserId,
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (supabaseUser.user_metadata?.clerk_id !== clerkUserId) {
    await admin.auth.admin.updateUserById(supabaseUser.id, {
      user_metadata: {
        ...supabaseUser.user_metadata,
        clerk_id: clerkUserId,
        first_name: firstName,
        last_name: lastName,
      },
    });
  }
}

async function main() {
  const clerkUsers = await listClerkUsers();
  let linked = 0;
  let alreadyLinked = 0;
  let noSupabaseMatch = 0;
  const unmatchedClerk = [];
  const linkedWithContent = [];

  for (const clerkUser of clerkUsers) {
    const emails = normalizeEmails(
      (clerkUser.email_addresses ?? []).map((entry) => entry.email_address)
    );

    if (emails.length === 0) continue;

    let match = null;
    for (const email of emails) {
      match = await findSupabaseUserByEmail(email);
      if (match) break;
    }

    if (!match) {
      noSupabaseMatch += 1;
      unmatchedClerk.push(emails[0]?.replace(/(.{2}).*(@.*)/, "$1***$2"));
      continue;
    }

    const { user: supabaseUser, profile } = match;
    const primaryEmail = emails[0];

    if (profile?.clerk_id === clerkUser.id && profile?.id === supabaseUser.id) {
      alreadyLinked += 1;
      continue;
    }

    await linkPair(clerkUser, supabaseUser, profile, primaryEmail);
    const contentScore = await scoreUserContent(supabaseUser.id);
    linked += 1;
    linkedWithContent.push({
      email: primaryEmail.replace(/(.{2}).*(@.*)/, "$1***$2"),
      contentScore,
    });
  }

  const { data: legacyProfiles } = await admin
    .from("profiles")
    .select("id, email, clerk_id");
  const legacyWithoutClerk = [];

  for (const profile of legacyProfiles ?? []) {
    if (profile.clerk_id || !profile.email) continue;
    const score = await scoreUserContent(profile.id);
    if (score > 0) {
      legacyWithoutClerk.push(profile.email.replace(/(.{2}).*(@.*)/, "$1***$2"));
    }
  }

  console.log(
    JSON.stringify(
      {
        clerkUsers: clerkUsers.length,
        newlyLinked: linked,
        alreadyLinked,
        clerkUsersWithoutLegacyMatch: noSupabaseMatch,
        legacyAccountsWithDataStillUnlinked: legacyWithoutClerk.length,
        linkedWithContent,
        unmatchedClerkEmails: unmatchedClerk,
        legacyUnlinkedEmails: legacyWithoutClerk,
      },
      null,
      2
    )
  );

  if (legacyWithoutClerk.length > 0) {
    console.log(
      "\nLegacy users with documents but no Clerk account must sign up at /sign-up using the same email."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
