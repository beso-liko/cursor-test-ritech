"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { User, Mail, Lock, Trash2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

type Status = { type: "success" | "error"; message: string } | null;

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
        status.type === "success"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-destructive/10 text-destructive"
      )}
    >
      {status.type === "success" ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      <span>{status.message}</span>
    </div>
  );
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();

  // Profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Email
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<Status>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((data) => {
        setCurrentEmail(data.email ?? "");
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
      })
      .catch(() => {});
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileStatus(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("account.profile.error"));
      setProfileStatus({ type: "success", message: t("account.profile.saved") });
    } catch (err) {
      setProfileStatus({ type: "error", message: err instanceof Error ? err.message : t("account.profile.error") });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailStatus(null);
    try {
      const res = await fetch("/api/account/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("account.email.error"));
      setEmailStatus({ type: "success", message: t("account.email.sent", { old: currentEmail, new: newEmail }) });
      setNewEmail("");
    } catch (err) {
      setEmailStatus({ type: "error", message: err instanceof Error ? err.message : t("account.email.error") });
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: t("account.password.mismatch") });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: t("account.password.short") });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("account.password.error"));
      setPasswordStatus({ type: "success", message: t("account.password.updated") });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordStatus({ type: "error", message: err instanceof Error ? err.message : t("account.password.error") });
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete account");
      }
      router.push("/auth/login");
    } catch (err) {
      console.error(err);
      setDeleteLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("account.back")}
          </Link>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("account.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("account.subtitle")}</p>
        </div>

        {/* Profile section */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("account.profile.title")}</h2>
              <p className="text-xs text-muted-foreground">{t("account.profile.desc")}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-medium">{t("account.profile.firstName")}</Label>
                <Input
                  id="firstName"
                  placeholder="e.g. Alex"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-medium">{t("account.profile.lastName")}</Label>
                <Input
                  id="lastName"
                  placeholder="e.g. Smith"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
            <StatusMessage status={profileStatus} />
            <Button type="submit" disabled={profileLoading} size="sm">
              {profileLoading ? t("account.profile.saving") : t("account.profile.save")}
            </Button>
          </form>
        </section>

        {/* Change email section */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("account.email.title")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("account.email.current")} <span className="text-foreground font-medium">{currentEmail || "—"}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newEmail" className="text-xs font-medium">{t("account.email.newLabel")}</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="new@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <StatusMessage status={emailStatus} />
            <Button type="submit" disabled={emailLoading || !newEmail} size="sm">
              {emailLoading ? t("account.email.sending") : t("account.email.submit")}
            </Button>
          </form>
        </section>

        {/* Change password section */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("account.password.title")}</h2>
              <p className="text-xs text-muted-foreground">{t("account.password.desc")}</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-medium">{t("account.password.new")}</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium">{t("account.password.confirm")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <StatusMessage status={passwordStatus} />
            <Button type="submit" disabled={passwordLoading || !newPassword || !confirmPassword} size="sm">
              {passwordLoading ? t("account.password.updating") : t("account.password.submit")}
            </Button>
          </form>
        </section>

        {/* Danger zone */}
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("account.delete.title")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("account.delete.desc")}
              </p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" size="sm" disabled={deleteLoading}>
                  {deleteLoading ? t("account.delete.deleting") : t("account.delete.trigger")}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("account.delete.dialog.title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("account.delete.dialog.desc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("account.delete.dialog.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? t("account.delete.deleting") : t("account.delete.dialog.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </AppShell>
  );
}
