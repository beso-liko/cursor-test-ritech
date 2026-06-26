"use client";

import { useEffect, useRef } from "react";
import { useChat, type Message } from "ai/react";
import { Send, Loader2, Bot, User, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

interface ChatInterfaceProps {
  documentId?: string;
  groupId?: string;
  /** Pre-fetched messages from the server — restores the previous conversation. */
  initialMessages?: Message[];
}

export default function ChatInterface({ documentId, groupId, initialMessages }: ChatInterfaceProps) {
  const { t, locale } = useLanguage();
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLoadingRef = useRef(false);

  // Refs so cleanup and event handlers always have fresh values without re-registering effects
  const messagesRef = useRef<Message[]>(initialMessages ?? []);
  const isLoadingRef = useRef(false);
  const prevCountRef = useRef((initialMessages ?? []).length);

  const chatBody = groupId ? { groupId, locale } : { documentId, locale };

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } =
    useChat({
      api: "/api/chat",
      body: chatBody,
      initialMessages: initialMessages ?? [],
      onError: (error) => {
        let isOffTopic = false;
        try {
          const parsed = JSON.parse(error.message);
          if (parsed?.error === "off_topic") isOffTopic = true;
        } catch {
          if (error.message.includes("off_topic")) isOffTopic = true;
        }

        if (isOffTopic) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content:
                "I can only answer questions about the uploaded material. This question appears to be outside that scope.",
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
    }
  }, [isLoading, messages, documentId, groupId]);

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
      if (input.trim() && !isLoading) {
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
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    handleInputChange({
                      target: { value: suggestion },
                    } as React.ChangeEvent<HTMLTextAreaElement>);
                  }}
                  className="text-xs border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
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
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border pt-4 mt-2">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            placeholder={t("chat.placeholder")}
            className="resize-none min-h-[44px] max-h-32 text-sm"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-11 w-11 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-1.5">
          {t("chat.hint")}
        </p>
      </div>
    </div>
  );
}
