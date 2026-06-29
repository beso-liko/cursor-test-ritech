/**
 * Repair Clerk → Supabase links created during migration.
 *
 * - Clears clerk_id from empty accounts so the next sign-in can relink by email
 * - Deletes duplicate empty Supabase auth users that have no content
 * - Backfills profile emails from auth.users
 *
 * Safe to re-run.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAllUsers() {
  const all = [];
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

async function main() {
  const users = await listAllUsers();
  const scores = new Map();

  for (const user of users) {
    scores.set(user.id, await scoreUserContent(user.id));
  }

  const { data: profiles } = await admin.from("profiles").select("id, clerk_id, email");
  let clearedLinks = 0;
  let deletedEmptyUsers = 0;
  let backfilledEmails = 0;

  for (const user of users) {
    if (user.email) {
      const { error } = await admin.from("profiles").upsert(
        {
          id: user.id,
          email: user.email.toLowerCase(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (!error) backfilledEmails += 1;
    }
  }

  for (const profile of profiles ?? []) {
    const score = scores.get(profile.id) ?? 0;
    if (!profile.clerk_id || score > 0) continue;

    await admin.from("profiles").update({ clerk_id: null }).eq("id", profile.id);

    const authUser = users.find((user) => user.id === profile.id);
    if (authUser?.user_metadata?.clerk_id) {
      await admin.auth.admin.updateUserById(profile.id, {
        user_metadata: {
          ...authUser.user_metadata,
          clerk_id: null,
        },
      });
    }

    await admin.auth.admin.deleteUser(profile.id);
    clearedLinks += 1;
    deletedEmptyUsers += 1;
  }

  for (const user of users) {
    const score = scores.get(user.id) ?? 0;
    if (score > 0) continue;
    if (!user.user_metadata?.clerk_id) continue;

    const stillExists = (profiles ?? []).some((profile) => profile.id === user.id);
    if (!stillExists) continue;

    await admin.auth.admin.deleteUser(user.id);
    deletedEmptyUsers += 1;
  }

  const legacyWithContent = [...scores.values()].filter((score) => score > 0).length;
  const linkedProfiles = (profiles ?? []).filter((profile) => profile.clerk_id).length;

  console.log(
    JSON.stringify(
      {
        supabaseUsers: users.length,
        usersWithContent: legacyWithContent,
        profilesWithClerkIdBefore: linkedProfiles,
        clearedEmptyClerkLinks: clearedLinks,
        deletedEmptyAuthUsers: deletedEmptyUsers,
        profileEmailsBackfilled: backfilledEmails,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
