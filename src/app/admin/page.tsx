import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { getAppUser, getClerkEmails } from "@/lib/auth/app-user";
import { isSuperuser } from "@/lib/auth/is-superuser";

export default async function AdminPage() {
  const user = await getAppUser();
  if (!user) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  const clerkEmails = clerkUser ? getClerkEmails(clerkUser) : [];

  if (!isSuperuser(user.email, ...clerkEmails)) {
    redirect("/");
  }

  return (
    <AppShell>
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage upload limits and monthly usage for all users.
          </p>
        </div>
        <AdminDashboard />
      </div>
    </AppShell>
  );
}
