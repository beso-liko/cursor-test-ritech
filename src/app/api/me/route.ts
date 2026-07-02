import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppUser, getClerkEmails } from "@/lib/auth/app-user";
import { isSuperuser } from "@/lib/auth/is-superuser";

export async function GET() {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const clerkEmails = clerkUser ? getClerkEmails(clerkUser) : [];

  return NextResponse.json({
    supabaseUserId: user.supabaseUserId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isSuperuser: isSuperuser(user.email, ...clerkEmails),
  });
}
