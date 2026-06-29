import { AlertCircle } from "lucide-react";

export default function ClerkAuthLoadError() {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-5 text-sm text-foreground">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        <div className="space-y-2">
          <p className="font-semibold">Sign-in could not load</p>
          <p className="text-muted-foreground">
            Clerk failed to initialize. On production this usually means the DNS
            record for{" "}
            <span className="font-mono text-xs">clerk.app.studybuddy.al</span>{" "}
            is missing or not propagated yet.
          </p>
          <p className="text-muted-foreground">
            In Clerk Dashboard → Production → Domains, add the DNS records Clerk
            shows, wait for them to verify, then click Deploy certificates and
            redeploy this app.
          </p>
        </div>
      </div>
    </div>
  );
}
