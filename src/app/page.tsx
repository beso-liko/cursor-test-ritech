import { createAuthClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import DashboardContent from "@/components/DashboardContent";
import { getAppUser } from "@/lib/auth/app-user";
import { getRecentDocuments, getUserStats } from "@/lib/supabase/user-queries";

export default async function DashboardPage() {
  const appUser = await getAppUser();

  const [stats, recentDocs, firstName] = appUser
    ? await Promise.all([
        getUserStats(appUser.supabaseUserId),
        getRecentDocuments(appUser.supabaseUserId),
        Promise.resolve(appUser.firstName),
      ])
    : [
        { totalDocuments: 0, totalFlashcards: 0, totalQuizzes: 0, quizzesTaken: 0 },
        [],
        null,
      ];

  return (
    <AppShell>
      <DashboardContent stats={stats} recentDocs={recentDocs} firstName={firstName} />
    </AppShell>
  );
}
