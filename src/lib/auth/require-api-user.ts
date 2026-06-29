import { NextResponse } from "next/server";
import { getAppUser, type AppUser } from "@/lib/auth/app-user";

export async function requireApiUser(): Promise<
  { user: AppUser } | NextResponse
> {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { user };
}
