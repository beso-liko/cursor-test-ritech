import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppUser, type AppUser } from "@/lib/auth/app-user";

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function requireApiUser(): Promise<
  { user: AppUser } | NextResponse
> {
  try {
    const user = await getAppUser();
    if (user) return { user };

    const { userId } = await auth();
    if (!userId) {
      return noStoreJson({ error: "Unauthorized" }, 401);
    }

    console.error("Clerk session present but Supabase user could not be resolved");
    return noStoreJson({ error: "Failed to resolve user account" }, 500);
  } catch (err) {
    console.error("requireApiUser error:", err);
    return noStoreJson({ error: "Failed to resolve user account" }, 500);
  }
}
