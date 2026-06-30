"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUpIcon, SparklesIcon, ChevronDownIcon } from "lucide-react";
import { Textarea } from "@peaqo/ui/components/textarea";
import { MessageResponse } from "@peaqo/ui/components/ai-elements/message";
import { cn } from "@peaqo/ui/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { config } from "@peaqo/trpc/config";
import { ModelChat, modelChatText, type SendSignal } from "@/components/model-chat";
import type { ChatModel } from "@/components/chat-model-selector";

export function SuperFiestaView() {
  const modelsQuery = trpc.models.listEnabled.useQuery();
  const models: ChatModel[] =
    modelsQuery.data && modelsQuery.data.length > 0
      ? modelsQuery.data.map((m) => ({ id: m.modelId, name: m.displayName, provider: m.provider }))
      : [config.fallbackModel];

  const [selected, setSelected] = useState<string[]>(() => models.slice(0, 3).map((m) => m.id));
  const [signal, setSignal] = useState<SendSignal>(null);
  const [text, setText] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [, setAnswerMap] = useState<Record<string, string>>({});
  const [showModels, setShowModels] = useState(true);

  const consensus = useChat({ transport: new DefaultChatTransport({ api: "/api/consensus" }) });

  function toggleModel(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function send() {
    const t = text.trim();
    if (!t || selected.length === 0) return;
    consensus.setMessages([]);
    setAnswerMap({});
    setShowModels(true);
    setLastPrompt(t);
    setSignal({ text: t, nonce: Date.now() });
    setText("");
  }

  // collect each model's finished answer; when all selected are in (and >=2),
  // fire consensus once and collapse the individual answers.
  function onComplete(modelId: string, answer: string) {
    setAnswerMap((prev) => {
      const next = { ...prev, [modelId]: answer };
      const done = selected.filter((id) => next[id]);
      if (
        selected.length >= 2 &&
        done.length === selected.length &&
        consensus.messages.length === 0
      ) {
        const collected = selected.map((id) => ({
          model: models.find((m) => m.id === id)?.name ?? id,
          text: next[id]!,
        }));
        consensus.sendMessage(
          { text: "consensus" },
          { body: { userPrompt: lastPrompt, answers: collected } },
        );
        setShowModels(false);
      }
      return next;
    });
  }

  const consensusText = modelChatText(consensus.messages);
  const hasConsensus = consensus.messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* model picker chips */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="text-muted-foreground mr-1 text-xs font-semibold uppercase tracking-wide">
          Models
        </span>
        {models.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggleModel(m.id)}
            data-on={selected.includes(m.id)}
            className="data-[on=true]:border-primary/50 data-[on=true]:bg-primary/5 data-[on=false]:opacity-50 rounded-full border px-3 py-1 text-xs font-medium transition-all"
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 p-4">
          {hasConsensus && (
            <div className="bg-card rounded-2xl border p-4">
              <div className="text-primary mb-2 flex items-center gap-1.5 text-xs font-semibold">
                <SparklesIcon className="size-3.5" /> Consensus
              </div>
              <MessageResponse>{consensusText || "Synthesizing…"}</MessageResponse>
            </div>
          )}

          {signal && (
            <div>
              {hasConsensus && (
                <button
                  type="button"
                  onClick={() => setShowModels((v) => !v)}
                  className="text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1 text-xs font-medium"
                >
                  <ChevronDownIcon
                    className={cn("size-3.5 transition-transform", !showModels && "-rotate-90")}
                  />
                  {showModels ? "Hide" : "Show"} {selected.length} model answers
                </button>
              )}
              {showModels && (
                <div className="space-y-3">
                  {selected.map((id) => (
                    <div key={id} className="rounded-xl border">
                      <div className="text-muted-foreground border-b px-3 py-1.5 text-xs font-semibold">
                        {models.find((m) => m.id === id)?.name ?? id}
                      </div>
                      <div className="h-48 overflow-hidden">
                        <ModelChat
                          modelId={id}
                          models={models}
                          signal={signal}
                          onComplete={onComplete}
                          showHeader={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <div className="mx-auto w-full max-w-2xl p-4">
        <div className="bg-card focus-within:border-primary/40 flex items-end gap-2 rounded-[18px] border p-2 shadow-lg shadow-black/5">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              selected.length
                ? `Ask ${selected.length} models…  ↵ to send`
                : "Pick at least one model"
            }
            className="max-h-40 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={send}
            disabled={selected.length === 0}
            className="brand-gradient grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-sm shadow-primary/30 hover:opacity-90 disabled:opacity-40"
          >
            <ArrowUpIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
