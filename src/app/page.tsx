import {
  FileText,
  Layers,
  ClipboardList,
  Trophy,
  ArrowRight,
  Upload,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/AppShell";
import StatsCard from "@/components/StatsCard";
import DocumentCard from "@/components/DocumentCard";
import type { Document } from "@/lib/supabase/types";

async function getStats() {
  try {
    const supabase = createServerClient();
    const [
      { count: totalDocs },
      { count: totalFlashcards },
      { count: totalQuizzes },
      { count: quizzesTaken },
    ] = await Promise.all([
      supabase.from("documents").select("*", { count: "exact", head: true }),
      supabase.from("flashcards").select("*", { count: "exact", head: true }),
      supabase.from("quizzes").select("*", { count: "exact", head: true }),
      supabase.from("quiz_results").select("*", { count: "exact", head: true }),
    ]);
    return {
      totalDocuments: totalDocs ?? 0,
      totalFlashcards: totalFlashcards ?? 0,
      totalQuizzes: totalQuizzes ?? 0,
      quizzesTaken: quizzesTaken ?? 0,
    };
  } catch {
    return { totalDocuments: 0, totalFlashcards: 0, totalQuizzes: 0, quizzesTaken: 0 };
  }
}

async function getRecentDocuments(): Promise<Document[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6);
    return (data as Document[]) ?? [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [stats, recentDocs] = await Promise.all([
    getStats(),
    getRecentDocuments(),
  ]);

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your AI-powered study workspace
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/upload" />} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatsCard
            title="Documents"
            value={stats.totalDocuments}
            icon={FileText}
            description="Total uploaded"
            color="indigo"
          />
          <StatsCard
            title="Flashcards"
            value={stats.totalFlashcards}
            icon={Layers}
            description="Generated cards"
            color="emerald"
          />
          <StatsCard
            title="Quizzes"
            value={stats.totalQuizzes}
            icon={ClipboardList}
            description="Created quizzes"
            color="amber"
          />
          <StatsCard
            title="Attempts"
            value={stats.quizzesTaken}
            icon={Trophy}
            description="Quizzes taken"
            color="rose"
          />
        </div>

        {/* Recent documents */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Recent Documents</h2>
            {recentDocs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/documents" />}
                className="gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {recentDocs.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">No documents yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Upload your first study document to get started with AI-powered
                summaries, flashcards, and quizzes.
              </p>
              <Button nativeButton={false} render={<Link href="/upload" />} className="mt-4 gap-2">
                <Upload className="w-4 h-4" />
                Upload your first document
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentDocs.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
