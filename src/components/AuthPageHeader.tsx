import { GraduationCap } from "lucide-react";

export default function AuthPageHeader() {
  return (
    <div className="flex flex-col items-center text-center mb-8">
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-primary to-orange-700 shadow-lg shadow-primary/40 flex items-center justify-center mb-3">
        <GraduationCap className="w-6 h-6 text-white" />
      </div>
      <p className="font-extrabold text-lg text-foreground tracking-tight">
        StudyBuddy
      </p>
      <p className="text-xs text-muted-foreground font-medium">
        AI Study Assistant
      </p>
    </div>
  );
}
