/**
 * One-time backfill for documents/folders missing user_id.
 * Safe to re-run; only updates rows where user_id is null.
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

const admin = createClient(url, key);

async function countNull(table) {
  const { count } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .is("user_id", null);
  return count ?? 0;
}

async function getPrimaryOwnerId() {
  const { data } = await admin.from("documents").select("user_id").not("user_id", "is", null);
  const totals = new Map();

  for (const row of data ?? []) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + 1);
  }

  let bestId = null;
  let bestCount = -1;
  for (const [userId, count] of totals) {
    if (count > bestCount) {
      bestCount = count;
      bestId = userId;
    }
  }

  return bestId;
}

async function main() {
  const beforeDocs = await countNull("documents");
  const beforeGroups = await countNull("document_groups");
  console.log(`Before: ${beforeDocs} documents, ${beforeGroups} folders without owner`);

  const { data: ownedGroups } = await admin
    .from("document_groups")
    .select("id, user_id")
    .not("user_id", "is", null);

  for (const group of ownedGroups ?? []) {
    await admin
      .from("documents")
      .update({ user_id: group.user_id })
      .is("user_id", null)
      .eq("group_id", group.id);
  }

  const { data: groupedDocs } = await admin
    .from("documents")
    .select("group_id, user_id")
    .not("group_id", "is", null)
    .not("user_id", "is", null);

  const countsByGroup = new Map();
  for (const row of groupedDocs ?? []) {
    const groupCounts = countsByGroup.get(row.group_id) ?? new Map();
    groupCounts.set(row.user_id, (groupCounts.get(row.user_id) ?? 0) + 1);
    countsByGroup.set(row.group_id, groupCounts);
  }

  for (const [groupId, userCounts] of countsByGroup) {
    let bestUserId = null;
    let bestCount = -1;

    for (const [userId, count] of userCounts) {
      if (count > bestCount) {
        bestCount = count;
        bestUserId = userId;
      }
    }

    if (bestUserId) {
      await admin
        .from("document_groups")
        .update({ user_id: bestUserId })
        .eq("id", groupId)
        .is("user_id", null);
    }
  }

  const { data: groupsAfterPass } = await admin
    .from("document_groups")
    .select("id, user_id")
    .not("user_id", "is", null);

  for (const group of groupsAfterPass ?? []) {
    await admin
      .from("documents")
      .update({ user_id: group.user_id })
      .is("user_id", null)
      .eq("group_id", group.id);
  }

  const primaryOwnerId = await getPrimaryOwnerId();
  if (primaryOwnerId) {
    await admin
      .from("documents")
      .update({ user_id: primaryOwnerId })
      .is("user_id", null)
      .is("group_id", null);

    await admin
      .from("document_groups")
      .update({ user_id: primaryOwnerId })
      .is("user_id", null);
  }

  const { data: finalGroups } = await admin
    .from("document_groups")
    .select("id, user_id")
    .not("user_id", "is", null);

  for (const group of finalGroups ?? []) {
    await admin
      .from("documents")
      .update({ user_id: group.user_id })
      .is("user_id", null)
      .eq("group_id", group.id);
  }

  const afterDocs = await countNull("documents");
  const afterGroups = await countNull("document_groups");
  console.log(`After: ${afterDocs} documents, ${afterGroups} folders without owner`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
