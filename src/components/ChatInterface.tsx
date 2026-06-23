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
}

export default function ChatInterface({ documentId, groupId }: ChatInterfaceProps) {
  const { t, locale } = useLanguage();
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatBody = groupId ? { groupId, locale } : { documentId, locale };

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      body: chatBody,
    });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    <div className="flex flex-col h-[600px]">
      {/* Messages */}
      <ScrollArea className="flex-1 pr-4">
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
