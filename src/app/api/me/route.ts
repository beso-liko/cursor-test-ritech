import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getClerkEmails } from "@/lib/auth/app-user";
import { isSuperuser } from "@/lib/auth/is-superuser";
import { requireApiUser } from "@/lib/auth/require-api-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const clerkUser = await currentUser();
  const clerkEmails = clerkUser ? getClerkEmails(clerkUser) : [];

  return NextResponse.json(
    {
      supabaseUserId: user.supabaseUserId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isSuperuser: isSuperuser(user.email, ...clerkEmails),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
