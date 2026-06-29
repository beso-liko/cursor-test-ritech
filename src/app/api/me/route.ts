import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/auth/app-user";

export async function GET() {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    supabaseUserId: user.supabaseUserId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  });
}
