import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import {
  deleteUserAccountBySupabaseId,
  findSupabaseUserIdByClerkId,
} from "@/lib/auth/delete-user-account";
import { linkClerkToSupabase } from "@/lib/auth/link-clerk-user";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(req);
  } catch (error) {
    console.error("Clerk webhook verification failed:", error);
    return new Response("Verification failed", { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const { id, email_addresses, first_name, last_name } = event.data;
    const emails = (email_addresses ?? [])
      .map((entry) => entry.email_address)
      .filter(Boolean) as string[];

    if (emails.length > 0) {
      await linkClerkToSupabase({
        clerkUserId: id,
        emails,
        firstName: first_name ?? null,
        lastName: last_name ?? null,
      });
    }
  }

  if (event.type === "user.deleted") {
    const clerkUserId = event.data.id;
    if (clerkUserId) {
      const admin = createAdminClient();
      const supabaseUserId = await findSupabaseUserIdByClerkId(admin, clerkUserId);
      if (supabaseUserId) {
        await deleteUserAccountBySupabaseId(admin, supabaseUserId);
      }
    }
  }

  return new Response("OK", { status: 200 });
}
