import { ArrowLeft, Sparkles, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/AppShell";
import FileUploader from "@/components/FileUploader";

const features = [
  {
    icon: Zap,
    title: "Instant Processing",
    desc: "Text is extracted and indexed in seconds",
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    desc: "Generate summaries, flashcards, and quizzes automatically",
  },
  {
    icon: ShieldCheck,
    title: "Secure Storage",
    desc: "Files stored securely in Supabase",
  },
];

export default function UploadPage() {
  return (
    <AppShell>
      <div className="px-8 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/" />}
            className="h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Upload Document</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Supported: PDF, DOCX, PPTX, TXT, PNG, JPEG — up to 20MB
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Uploader */}
          <div className="md:col-span-3">
            <FileUploader />
          </div>

          {/* Feature sidebar */}
          <div className="md:col-span-2 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              What happens next
            </p>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
