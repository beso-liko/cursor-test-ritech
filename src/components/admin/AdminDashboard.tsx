"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string;
  timezone: string;
  used: number;
  limit: number | null;
  unlimited: boolean;
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

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>(null);
  const [draftLimits, setDraftLimits] = useState<Record<string, string>>({});
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

      <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isBusy = busyUserId === user.id;
              const draft = draftLimits[user.id] ?? String(user.limit ?? 15);

              return (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-4 py-3 align-top">{user.email}</td>
                  <td className="px-4 py-3 align-top">
                    {user.unlimited
                      ? `${user.used} / Unlimited`
                      : `${user.used} / ${user.limit ?? 15}`}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={draft}
                        onChange={(e) =>
                          setDraftLimits((prev) => ({
                            ...prev,
                            [user.id]: e.target.value,
                          }))
                        }
                        className="w-24 h-8"
                        disabled={isBusy || user.unlimited}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() =>
                          updateUser(user.id, {
                            action: "set_limit",
                            limit: Number(draft),
                          })
                        }
                      >
                        Set limit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => updateUser(user.id, { action: "reset_limit" })}
                      >
                        Reset limit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => updateUser(user.id, { action: "remove_limit" })}
                      >
                        Remove limit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => updateUser(user.id, { action: "reset_usage" })}
                      >
                        Reset usage
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 md:hidden">
        {users.map((user) => {
          const isBusy = busyUserId === user.id;
          const draft = draftLimits[user.id] ?? String(user.limit ?? 15);

          return (
            <div key={user.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {user.unlimited
                    ? `${user.used} / Unlimited`
                    : `${user.used} / ${user.limit ?? 15}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="number"
                  min={0}
                  value={draft}
                  onChange={(e) =>
                    setDraftLimits((prev) => ({
                      ...prev,
                      [user.id]: e.target.value,
                    }))
                  }
                  className="w-full h-8"
                  disabled={isBusy || user.unlimited}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={isBusy}
                  onClick={() =>
                    updateUser(user.id, {
                      action: "set_limit",
                      limit: Number(draft),
                    })
                  }
                >
                  Set limit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={isBusy}
                  onClick={() => updateUser(user.id, { action: "reset_limit" })}
                >
                  Reset limit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={isBusy}
                  onClick={() => updateUser(user.id, { action: "remove_limit" })}
                >
                  Remove limit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={isBusy}
                  onClick={() => updateUser(user.id, { action: "reset_usage" })}
                >
                  Reset usage
                </Button>
              </div>
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
