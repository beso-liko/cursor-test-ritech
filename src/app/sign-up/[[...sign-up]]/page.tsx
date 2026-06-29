import { SignUp } from "@clerk/nextjs";
import { GraduationCap } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 md:px-8 md:py-8 bg-background">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-primary to-orange-700 shadow-lg shadow-primary/40 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-extrabold text-lg text-foreground tracking-tight">
            StudyBuddy
          </p>
          <p className="text-xs text-muted-foreground font-medium">
            AI Study Assistant
          </p>
        </div>
      </div>
      <SignUp />
    </div>
  );
}
