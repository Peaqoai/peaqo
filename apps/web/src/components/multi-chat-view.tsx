"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUpIcon, SparklesIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@peaqo/ui/components/textarea";
import { MessageResponse } from "@peaqo/ui/components/ai-elements/message";
import { trpc } from "@/lib/trpc/client";
import { config } from "@peaqo/trpc/config";
import { ModelChat, modelChatText, type SendSignal } from "@/components/model-chat";
import type { ChatModel } from "@/components/chat-model-selector";

const MAX_COLUMNS = 4;

export function MultiChatView() {
  const modelsQuery = trpc.models.listEnabled.useQuery();
  const models: ChatModel[] =
    modelsQuery.data && modelsQuery.data.length > 0
      ? modelsQuery.data.map((m) => ({ id: m.modelId, name: m.displayName, provider: m.provider }))
      : [config.fallbackModel];

  // one entry per column: its model + enabled flag. Seed up to 3 distinct models.
  const [columns, setColumns] = useState(() =>
    models.slice(0, 3).map((m, i) => ({ key: i, modelId: m.id, enabled: true })),
  );
  const [nextKey, setNextKey] = useState(columns.length);
  const [signal, setSignal] = useState<SendSignal>(null);
  const [text, setText] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});

  // consensus stream (one useChat hitting /api/consensus)
  const consensus = useChat({ transport: new DefaultChatTransport({ api: "/api/consensus" }) });

  function send() {
    const t = text.trim();
    if (!t) return;
    consensus.setMessages([]);
    setAnswerMap({});
    setLastPrompt(t);
    setSignal({ text: t, nonce: Date.now() });
    setText("");
  }

  function onComplete(modelId: string, answer: string) {
    setAnswerMap((a) => ({ ...a, [modelId]: answer }));
  }

  function generateConsensus() {
    const enabledIds = columns.filter((c) => c.enabled).map((c) => c.modelId);
    const collected = enabledIds
      .map((id) => ({ model: models.find((m) => m.id === id)?.name ?? id, text: answerMap[id] }))
      .filter((a) => a.text);
    if (collected.length < 2) {
      toast.error("Need at least 2 answers for consensus");
      return;
    }
    consensus.setMessages([]);
    consensus.sendMessage(
      { text: "consensus" },
      { body: { userPrompt: lastPrompt, answers: collected } },
    );
  }

  function setColumnModel(key: number, modelId: string) {
    setColumns((cs) => cs.map((c) => (c.key === key ? { ...c, modelId } : c)));
  }
  function toggleColumn(key: number) {
    setColumns((cs) => cs.map((c) => (c.key === key ? { ...c, enabled: !c.enabled } : c)));
  }
  function addColumn() {
    if (columns.length >= MAX_COLUMNS) return;
    setColumns((cs) => [...cs, { key: nextKey, modelId: models[0]!.id, enabled: true }]);
    setNextKey((k) => k + 1);
  }
  function removeColumn(key: number) {
    setColumns((cs) => (cs.length <= 1 ? cs : cs.filter((c) => c.key !== key)));
  }

  const consensusText = modelChatText(consensus.messages);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 divide-x">
        {columns.map((col) => (
          <div key={col.key} className="relative flex min-w-0 flex-1 flex-col">
            {columns.length > 1 && (
              <button
                type="button"
                onClick={() => removeColumn(col.key)}
                aria-label="Remove column"
                className="text-muted-foreground hover:text-foreground absolute right-2 top-2 z-10"
              >
                <XIcon className="size-4" />
              </button>
            )}
            <ModelChat
              modelId={col.modelId}
              models={models}
              onModelChange={(id) => setColumnModel(col.key, id)}
              enabled={col.enabled}
              onToggle={() => toggleColumn(col.key)}
              signal={signal}
              onComplete={onComplete}
            />
          </div>
        ))}
        {columns.length < MAX_COLUMNS && (
          <button
            type="button"
            onClick={addColumn}
            className="text-muted-foreground hover:bg-accent hover:text-foreground grid w-12 shrink-0 place-items-center"
            aria-label="Add model column"
          >
            <PlusIcon className="size-5" />
          </button>
        )}
      </div>

      {consensus.messages.length > 0 && (
        <div className="bg-card mx-4 mb-2 rounded-xl border p-3 text-sm">
          <div className="text-primary mb-1 flex items-center gap-1.5 text-xs font-semibold">
            <SparklesIcon className="size-3.5" /> Consensus
          </div>
          <MessageResponse>{consensusText || "Synthesizing…"}</MessageResponse>
        </div>
      )}

      <div className="border-t p-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <button
            type="button"
            onClick={generateConsensus}
            className="hover:bg-accent flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium"
          >
            <SparklesIcon className="size-4" /> Consensus
          </button>
          <div className="bg-card focus-within:border-primary/40 flex flex-1 items-end gap-2 rounded-[18px] border p-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message all models…  ↵ to send"
              className="max-h-40 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={send}
              className="brand-gradient grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-sm shadow-primary/30 hover:opacity-90"
            >
              <ArrowUpIcon className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
