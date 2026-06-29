/**
 * Create Clerk accounts for legacy Supabase users who have data but no Clerk login yet.
 * After running, users can sign in via "Forgot password" or Google using the same email.
 *
 * Usage: node scripts/import-legacy-users-to-clerk.mjs
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

async function listClerkEmails() {
  const emails = new Set();
  let offset = 0;

  while (true) {
    const response = await fetch(
      `https://api.clerk.com/v1/users?limit=100&offset=${offset}`,
      { headers: { Authorization: `Bearer ${clerkSecretKey}` } }
    );

    if (!response.ok) {
      throw new Error(`Clerk API error ${response.status}: ${await response.text()}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const user of batch) {
      for (const entry of user.email_addresses ?? []) {
        if (entry.email_address) emails.add(entry.email_address.toLowerCase());
      }
    }

    if (batch.length < 100) break;
    offset += 100;
  }

  return emails;
}

async function createClerkUser({ email, firstName, lastName }) {
  const response = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [email],
      first_name: firstName ?? undefined,
      last_name: lastName ?? undefined,
      skip_password_requirement: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create Clerk user for ${email}: ${response.status} ${body}`);
  }

  return response.json();
}

async function linkToSupabase(clerkUser, supabaseUserId, profile, email) {
  await admin
    .from("profiles")
    .update({ clerk_id: null })
    .eq("clerk_id", clerkUser.id)
    .neq("id", supabaseUserId);

  await admin.from("profiles").upsert(
    {
      id: supabaseUserId,
      email: email.toLowerCase(),
      clerk_id: clerkUser.id,
      first_name: profile?.first_name ?? clerkUser.first_name ?? null,
      last_name: profile?.last_name ?? clerkUser.last_name ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  const { data: authUser } = await admin.auth.admin.getUserById(supabaseUserId);
  if (authUser.user) {
    await admin.auth.admin.updateUserById(supabaseUserId, {
      user_metadata: {
        ...authUser.user.user_metadata,
        clerk_id: clerkUser.id,
      },
    });
  }
}

async function main() {
  const clerkEmails = await listClerkEmails();
  const { data: profiles } = await admin.from("profiles").select("*");

  let created = 0;
  let skipped = 0;
  const results = [];

  for (const profile of profiles ?? []) {
    if (profile.clerk_id) {
      skipped += 1;
      continue;
    }

    const score = await scoreUserContent(profile.id);
    if (score === 0) continue;

    let email = profile.email?.toLowerCase() ?? null;
    if (!email) {
      const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
      email = authUser.user?.email?.toLowerCase() ?? null;
    }

    if (!email) continue;
    if (clerkEmails.has(email)) continue;

    const clerkUser = await createClerkUser({
      email,
      firstName: profile.first_name,
      lastName: profile.last_name,
    });

    await linkToSupabase(clerkUser, profile.id, profile, email);
    clerkEmails.add(email);
    created += 1;
    results.push({
      email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
      contentScore: score,
      clerkUserId: clerkUser.id,
    });
  }

  console.log(
    JSON.stringify(
      {
        clerkAccountsCreated: created,
        skippedAlreadyLinked: skipped,
        imported: results,
      },
      null,
      2
    )
  );

  if (created > 0) {
    console.log(
      "\nImported users should use Forgot password on /sign-in, or Continue with Google using the same email."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
