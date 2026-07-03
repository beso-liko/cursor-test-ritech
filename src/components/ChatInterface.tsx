"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat, type Message } from "ai/react";
import { Send, Loader2, Bot, User, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import SelectableContent from "@/components/notes/SelectableContent";

interface ChatInterfaceProps {
  documentId?: string;
  groupId?: string;
  /** Active generation focus, if the user chose topic-focused materials. */
  generationFocus?: string | null;
  /** Pre-fetched messages from the server — restores the previous conversation. */
  initialMessages?: Message[];
}

interface ChatUsage {
  used: number;
  limit: number | null;
  unlimited: boolean;
  remaining: number | null;
  resetsOn?: string;
}

export default function ChatInterface({
  documentId,
  groupId,
  generationFocus,
  initialMessages,
}: ChatInterfaceProps) {
  const { t, locale } = useLanguage();
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLoadingRef = useRef(false);
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  // Refs so cleanup and event handlers always have fresh values without re-registering effects
  const messagesRef = useRef<Message[]>(initialMessages ?? []);
  const isLoadingRef = useRef(false);
  const prevCountRef = useRef((initialMessages ?? []).length);

  const chatBody = {
    ...(groupId ? { groupId } : { documentId }),
    locale,
    ...(generationFocus ? { generationFocus } : {}),
  };

  const fetchUsage = useCallback(async () => {
    const res = await fetch("/api/chat/usage");
    if (res.ok) {
      setUsage(await res.json());
    }
  }, []);

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  const atLimit =
    usage != null && !usage.unlimited && (usage.remaining ?? 0) <= 0;

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } =
    useChat({
      api: "/api/chat",
      body: chatBody,
      initialMessages: initialMessages ?? [],
      onError: (error) => {
        let parsed: { error?: string; code?: string } | null = null;
        try {
          parsed = JSON.parse(error.message);
        } catch {
          // ignore
        }

        if (parsed?.code === "chat_limit_exceeded") {
          setLimitError(parsed.error ?? t("chat.limit.reached"));
          void fetchUsage();
          return;
        }

        let isOffTopic = false;
        if (parsed?.error === "off_topic") isOffTopic = true;
        if (!isOffTopic && error.message.includes("off_topic")) isOffTopic = true;

        if (isOffTopic) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: t("chat.offTopic"),
              createdAt: new Date(),
            },
          ]);
        }
      },
    });

  // Keep refs in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Layer 1 — save the user message immediately when sent, before the AI replies.
  // This ensures the user's question is persisted even if they navigate away during generation.
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      prevCountRef.current = messages.length;
      if (lastMsg?.role === "user") {
        const key = groupId ? { groupId } : { documentId };
        const storable = messages.map(({ id, role, content }) => ({ id, role, content }));
        fetch("/api/chat-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...key, messages: storable }),
          keepalive: true,
        }).catch(console.error);
      }
    }
  }, [messages, documentId, groupId]);

  // Layer 2 — save the full exchange once the AI finishes streaming.
  useEffect(() => {
    const justFinished = prevLoadingRef.current && !isLoading;
    prevLoadingRef.current = isLoading;

    if (justFinished && messages.length > 0) {
      const key = groupId ? { groupId } : { documentId };
      const storable = messages.map(({ id, role, content }) => ({ id, role, content }));
      fetch("/api/chat-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...key, messages: storable }),
        keepalive: true,
      }).catch(console.error);
      void fetchUsage();
    }
  }, [isLoading, messages, documentId, groupId, fetchUsage]);

  // Layer 3 — save on unmount (full page navigation).
  // keepalive: true lets the request complete even after the page starts unloading.
  // If the AI was mid-stream, strip the incomplete assistant message so only
  // finished exchanges are stored (the user message was already saved by Layer 1).
  useEffect(() => {
    return () => {
      let msgs = messagesRef.current;
      if (msgs.length === 0) return;
      if (isLoadingRef.current && msgs[msgs.length - 1]?.role === "assistant") {
        msgs = msgs.slice(0, -1);
      }
      if (msgs.length === 0) return;
      const key = groupId ? { groupId } : { documentId };
      const storable = msgs.map(({ id, role, content }) => ({ id, role, content }));
      fetch("/api/chat-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...key, messages: storable }),
        keepalive: true,
      }).catch(console.error);
    };
  // documentId / groupId are stable for the lifetime of this component instance
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && !atLimit) {
        setLimitError(null);
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const suggestions = [
    t("chat.suggestion.1"),
    t("chat.suggestion.2"),
    t("chat.suggestion.3"),
  ];

  return (
    <div className="flex flex-col h-[480px] md:h-[600px]">
      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 pr-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {t("chat.title")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                {t("chat.desc")}
              </p>
              {generationFocus && (
                <p className="text-xs text-muted-foreground mt-2 max-w-sm rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  {t("chat.focusNote", { focus: generationFocus })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  disabled={atLimit}
                  onClick={() => {
                    handleInputChange({
                      target: { value: suggestion },
                    } as React.ChangeEvent<HTMLTextAreaElement>);
                  }}
                  className="text-xs border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <SelectableContent className="space-y-4 py-4">
            {messages.map((msg: Message) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-accent text-foreground rounded-bl-sm"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-accent rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </SelectableContent>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border pt-4 mt-2">
        {limitError && (
          <p className="mb-2 text-xs text-destructive">{limitError}</p>
        )}
        {atLimit && !limitError && (
          <p className="mb-2 text-xs text-destructive">
            {t("chat.limit.reached", {
              used: usage?.used ?? 0,
              limit: usage?.limit ?? 20,
            })}
          </p>
        )}
        <form
          onSubmit={(e) => {
            if (atLimit) {
              e.preventDefault();
              return;
            }
            setLimitError(null);
            handleSubmit(e);
          }}
          className="flex gap-2 items-end"
        >
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            placeholder={t("chat.placeholder")}
            className="resize-none min-h-[44px] max-h-32 text-sm"
            rows={1}
            disabled={atLimit}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || atLimit}
            className="h-11 w-11 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <div className="mt-1.5 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{t("chat.hint")}</p>
          {usage && !usage.unlimited && usage.limit != null && (
            <p className="text-xs text-muted-foreground">
              {t("chat.usage.limited", {
                used: usage.used,
                limit: usage.limit,
              })}
              {usage.resetsOn
                ? ` · ${t("chat.usage.resets", { date: usage.resetsOn })}`
                : null}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
