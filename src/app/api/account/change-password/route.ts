import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    { error: "Password changes are managed through your Clerk account settings." },
    { status: 400 }
  );
}
