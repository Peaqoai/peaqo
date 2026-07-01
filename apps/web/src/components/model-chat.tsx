"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { cn } from "@peaqo/ui/lib/utils";
import { MessageResponse } from "@peaqo/ui/components/ai-elements/message";
import { Shimmer } from "@peaqo/ui/components/ai-elements/shimmer";
import { ChatModelSelector, type ChatModel } from "@/components/chat-model-selector";
import { type PromptInputMessage } from "@peaqo/ui/components/ai-elements/prompt-input";

export type SendSignal = {
  text: string;
  nonce: number;
  files?: PromptInputMessage["files"];
  webSearch?: boolean;
  personaId?: string;
} | null;

// one broadcast turn of a Super AI session, as stored/reloaded
export type SuperTurn = {
  prompt: string;
  answers: { modelId: string; model: string; text: string }[];
  consensus?: string;
};
export type SuperSession = {
  id: string;
  models: { modelId: string; enabled: boolean }[];
  turns: SuperTurn[];
} | null;

// rebuild a single model's chat thread from a session's turns (user prompt +
// that model's answer per turn), for seeding useChat on reload
export function turnsToMessages(turns: SuperTurn[], modelId: string): UIMessage[] {
  const out: UIMessage[] = [];
  turns.forEach((t, i) => {
    out.push({ id: `u${i}`, role: "user", parts: [{ type: "text", text: t.prompt }] });
    const a = t.answers.find((x) => x.modelId === modelId);
    if (a) out.push({ id: `a${i}`, role: "assistant", parts: [{ type: "text", text: a.text }] });
  });
  return out;
}

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
  signal,
  onComplete,
  showHeader = true,
  headerActions,
  initialMessages,
}: {
  modelId: string;
  models: ChatModel[];
  onModelChange?: (id: string) => void;
  enabled?: boolean;
  signal: SendSignal;
  onComplete?: (modelId: string, text: string) => void;
  showHeader?: boolean;
  headerActions?: ReactNode;
  initialMessages?: UIMessage[];
}) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: initialMessages,
  });

  // fire one send per new signal nonce, only while enabled. Ref guards against
  // re-sending the same nonce on unrelated re-renders.
  const lastNonce = useRef(0);
  useEffect(() => {
    if (!signal || !enabled || signal.nonce === lastNonce.current) return;
    lastNonce.current = signal.nonce;
    sendMessage(
      { text: signal.text, files: signal.files },
      { body: { modelId, webSearch: signal.webSearch, personaId: signal.personaId } },
    );
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
          {headerActions && <div className="flex items-center gap-1">{headerActions}</div>}
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
