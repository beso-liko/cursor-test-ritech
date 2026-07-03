"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_MONTHLY_CHAT_LIMIT } from "@/lib/chat/constants";
import { DEFAULT_MONTHLY_UPLOAD_LIMIT } from "@/lib/upload/constants";

type AdminUser = {
  id: string;
  email: string;
  timezone: string;
  uploadUsed: number;
  uploadLimit: number | null;
  uploadUnlimited: boolean;
  chatLimit: number | null;
  chatUnlimited: boolean;
  periodKey: string;
};

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

function LimitControls({
  isBusy,
  draft,
  onDraftChange,
  onAction,
  labels,
}: {
  isBusy: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onAction: (body: Record<string, unknown>) => void;
  labels: {
    usage: string;
    setLimit: string;
    resetLimit: string;
    removeLimit: string;
    resetUsage: string;
    setAction: string;
    resetAction: string;
    removeAction: string;
    resetUsageAction: string;
  };
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{labels.usage}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min={0}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          className="w-24 h-8"
          disabled={isBusy}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={() => onAction({ action: labels.setAction, limit: Number(draft) })}
        >
          {labels.setLimit}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={() => onAction({ action: labels.resetAction })}
        >
          {labels.resetLimit}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={() => onAction({ action: labels.removeAction })}
        >
          {labels.removeLimit}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={() => onAction({ action: labels.resetUsageAction })}
        >
          {labels.resetUsage}
        </Button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>(null);
  const [uploadDrafts, setUploadDrafts] = useState<Record<string, string>>({});
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({});
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setStatus({ type: "error", message: "Failed to load users." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const updateUser = async (userId: string, body: Record<string, unknown>) => {
    setBusyUserId(userId);
    setStatus(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");

      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? data.user : user))
      );
      setStatus({ type: "success", message: "User updated." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Update failed.",
      });
    } finally {
      setBusyUserId(null);
    }
  };

  const formatUploadUsage = (user: AdminUser) =>
    user.uploadUnlimited
      ? `${user.uploadUsed} / Unlimited`
      : `${user.uploadUsed} / ${user.uploadLimit ?? DEFAULT_MONTHLY_UPLOAD_LIMIT}`;

  const formatChatLimit = (user: AdminUser) =>
    user.chatUnlimited
      ? "Unlimited"
      : `${user.chatLimit ?? DEFAULT_MONTHLY_CHAT_LIMIT} / month`;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading users…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatusMessage status={status} />

      <div className="hidden lg:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Upload limits</th>
              <th className="px-4 py-3 font-medium">Chat limits</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isBusy = busyUserId === user.id;
              const uploadDraft =
                uploadDrafts[user.id] ??
                String(user.uploadLimit ?? DEFAULT_MONTHLY_UPLOAD_LIMIT);
              const chatDraft =
                chatDrafts[user.id] ??
                String(user.chatLimit ?? DEFAULT_MONTHLY_CHAT_LIMIT);

              return (
                <tr key={user.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <LimitControls
                      isBusy={isBusy}
                      draft={uploadDraft}
                      onDraftChange={(value) =>
                        setUploadDrafts((prev) => ({ ...prev, [user.id]: value }))
                      }
                      onAction={(body) => updateUser(user.id, body)}
                      labels={{
                        usage: formatUploadUsage(user),
                        setLimit: "Set limit",
                        resetLimit: "Reset limit",
                        removeLimit: "Remove limit",
                        resetUsage: "Reset usage",
                        setAction: "set_limit",
                        resetAction: "reset_limit",
                        removeAction: "remove_limit",
                        resetUsageAction: "reset_usage",
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <LimitControls
                      isBusy={isBusy}
                      draft={chatDraft}
                      onDraftChange={(value) =>
                        setChatDrafts((prev) => ({ ...prev, [user.id]: value }))
                      }
                      onAction={(body) => updateUser(user.id, body)}
                      labels={{
                        usage: formatChatLimit(user),
                        setLimit: "Set limit",
                        resetLimit: "Reset limit",
                        removeLimit: "Remove limit",
                        resetUsage: "Reset usage",
                        setAction: "set_chat_limit",
                        resetAction: "reset_chat_limit",
                        removeAction: "remove_chat_limit",
                        resetUsageAction: "reset_chat_usage",
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {users.map((user) => {
          const isBusy = busyUserId === user.id;
          const uploadDraft =
            uploadDrafts[user.id] ??
            String(user.uploadLimit ?? DEFAULT_MONTHLY_UPLOAD_LIMIT);
          const chatDraft =
            chatDrafts[user.id] ??
            String(user.chatLimit ?? DEFAULT_MONTHLY_CHAT_LIMIT);

          return (
            <div
              key={user.id}
              className="rounded-xl border border-border bg-card p-4 space-y-4"
            >
              <p className="text-sm font-medium text-foreground">{user.email}</p>
              <LimitControls
                isBusy={isBusy}
                draft={uploadDraft}
                onDraftChange={(value) =>
                  setUploadDrafts((prev) => ({ ...prev, [user.id]: value }))
                }
                onAction={(body) => updateUser(user.id, body)}
                labels={{
                  usage: `Uploads: ${formatUploadUsage(user)}`,
                  setLimit: "Set upload limit",
                  resetLimit: "Reset upload limit",
                  removeLimit: "Unlimited uploads",
                  resetUsage: "Reset upload usage",
                  setAction: "set_limit",
                  resetAction: "reset_limit",
                  removeAction: "remove_limit",
                  resetUsageAction: "reset_usage",
                }}
              />
              <LimitControls
                isBusy={isBusy}
                draft={chatDraft}
                onDraftChange={(value) =>
                  setChatDrafts((prev) => ({ ...prev, [user.id]: value }))
                }
                onAction={(body) => updateUser(user.id, body)}
                labels={{
                  usage: `Chat: ${formatChatLimit(user)}`,
                  setLimit: "Set chat limit",
                  resetLimit: "Reset chat limit",
                  removeLimit: "Unlimited chat",
                  resetUsage: "Reset chat usage",
                  setAction: "set_chat_limit",
                  resetAction: "reset_chat_limit",
                  removeAction: "remove_chat_limit",
                  resetUsageAction: "reset_chat_usage",
                }}
              />
            </div>
          );
        })}
      </div>

      {users.length === 0 && (
        <p className="text-sm text-muted-foreground">No users with email addresses found.</p>
      )}
    </div>
  );
}
