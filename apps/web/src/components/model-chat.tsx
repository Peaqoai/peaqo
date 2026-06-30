"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Switch } from "@peaqo/ui/components/switch";
import { cn } from "@peaqo/ui/lib/utils";
import { MessageResponse } from "@peaqo/ui/components/ai-elements/message";
import { Shimmer } from "@peaqo/ui/components/ai-elements/shimmer";
import { ChatModelSelector, type ChatModel } from "@/components/chat-model-selector";

export type SendSignal = { text: string; nonce: number } | null;

// last assistant turn's concatenated text — what consensus consumes
export function modelChatText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "assistant");
  return last?.parts.map((p) => ("text" in p ? p.text : "")).join("") ?? "";
}

export function ModelChat({
  modelId,
  models,
  onModelChange,
  enabled = true,
  onToggle,
  signal,
  onComplete,
  showHeader = true,
}: {
  modelId: string;
  models: ChatModel[];
  onModelChange?: (id: string) => void;
  enabled?: boolean;
  onToggle?: () => void;
  signal: SendSignal;
  onComplete?: (modelId: string, text: string) => void;
  showHeader?: boolean;
}) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  // fire one send per new signal nonce, only while enabled. Ref guards against
  // re-sending the same nonce on unrelated re-renders.
  const lastNonce = useRef(0);
  useEffect(() => {
    if (!signal || !enabled || signal.nonce === lastNonce.current) return;
    lastNonce.current = signal.nonce;
    sendMessage({ text: signal.text }, { body: { modelId } });
  }, [signal, enabled, modelId, sendMessage]);

  // report the finished answer up so the parent can build consensus
  const reported = useRef(0);
  useEffect(() => {
    if (status !== "ready" || reported.current === lastNonce.current) return;
    const text = modelChatText(messages);
    if (text) {
      reported.current = lastNonce.current;
      onComplete?.(modelId, text);
    }
  }, [status, messages, modelId, onComplete]);

  return (
    <div className="flex h-full min-w-0 flex-col">
      {showHeader && (
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <ChatModelSelector
            value={modelId}
            onChange={(id) => onModelChange?.(id)}
            models={models}
          />
          {onToggle && <Switch checked={enabled} onCheckedChange={onToggle} />}
        </div>
      )}
      <div
        className={cn("flex-1 space-y-4 overflow-y-auto p-3 text-sm", !enabled && "opacity-40")}
      >
        {messages.map((m) => (
          <div key={m.id} className={cn(m.role === "user" && "text-right")}>
            <div
              className={cn(
                "inline-block rounded-2xl px-3 py-2 text-left",
                m.role === "user" ? "bg-secondary" : "bg-card border",
              )}
            >
              {m.parts.map((p, i) =>
                "text" in p ? <MessageResponse key={i}>{p.text}</MessageResponse> : null,
              )}
            </div>
          </div>
        ))}
        {status === "submitted" && <Shimmer>Thinking…</Shimmer>}
      </div>
    </div>
  );
}
