"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SparklesIcon, ChevronDownIcon } from "lucide-react";
import { MessageResponse } from "@peaqo/ui/components/ai-elements/message";
import { cn } from "@peaqo/ui/lib/utils";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { config } from "@peaqo/trpc/config";
import {
  ModelChat,
  modelChatText,
  type SendSignal,
  type SuperSession,
  type SuperTurn,
} from "@/components/model-chat";
import { ModelMultiSelect, type ChatModel } from "@/components/chat-model-selector";
import { SuperComposer, type ComposerSubmit } from "@/components/super-composer";

function ConsensusBox({ text }: { text: string }) {
  return (
    <div className="bg-card rounded-2xl border p-4">
      <div className="text-primary mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <SparklesIcon className="size-3.5" /> Consensus
      </div>
      <MessageResponse>{text || "Synthesizing…"}</MessageResponse>
    </div>
  );
}

export function SuperFiestaView({ session }: { session: SuperSession }) {
  const { data: authSession } = authClient.useSession();
  const modelsQuery = trpc.models.listEnabled.useQuery();
  const models: ChatModel[] =
    modelsQuery.data && modelsQuery.data.length > 0
      ? modelsQuery.data.map((m) => ({ id: m.modelId, name: m.displayName, provider: m.provider }))
      : [config.fallbackModel];
  const nameOf = (id: string) => models.find((m) => m.id === id)?.name ?? id;

  const [selected, setSelected] = useState<string[]>(() =>
    session?.models.length ? session.models.map((m) => m.modelId) : models.slice(0, 3).map((m) => m.id),
  );
  const [history, setHistory] = useState<SuperTurn[]>(session?.turns ?? []);
  const [convId, setConvId] = useState<string | null>(session?.id ?? null);
  const [signal, setSignal] = useState<SendSignal>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [showModels, setShowModels] = useState(true);

  const consensus = useChat({ transport: new DefaultChatTransport({ api: "/api/consensus" }) });

  const saveTurn = trpc.conversation.saveSuperTurn.useMutation();
  const utils = trpc.useUtils();

  // per-broadcast bookkeeping
  const pending = useRef<Set<string>>(new Set());
  const answers = useRef<Record<string, string>>({});
  const finalizedNonce = useRef(0);

  function send(p: ComposerSubmit) {
    const t = p.text.trim();
    if (!t || selected.length === 0) return;
    consensus.setMessages([]);
    setShowModels(true);
    setLastPrompt(t);
    pending.current = new Set(selected);
    answers.current = {};
    setSignal({ text: t, nonce: Date.now(), files: p.files, webSearch: p.webSearch, personaId: p.personaId });
  }

  async function finalize(consensusText: string | undefined, prompt: string) {
    const turn: SuperTurn = {
      prompt,
      answers: selected.map((id) => ({ modelId: id, model: nameOf(id), text: answers.current[id] ?? "" })),
      consensus: consensusText,
    };
    setHistory((h) => [...h, turn]);
    setSignal(null);
    consensus.setMessages([]);
    if (!authSession?.user) return; // ephemeral for logged-out users
    try {
      const res = await saveTurn.mutateAsync({
        id: convId ?? undefined,
        mode: "super-fiesta",
        models: selected.map((id) => ({ modelId: id, enabled: true })),
        title: prompt,
        turn,
      });
      if (!convId) {
        setConvId(res.id);
        window.history.replaceState(null, "", `/chat/super-ai/${res.id}`);
      }
      utils.conversation.list.invalidate();
    } catch {
      /* keep the live session if the save fails */
    }
  }

  // collect each model's answer; when all are in, either fire consensus (>=2
  // models) or finalize immediately (single model, no consensus).
  function onComplete(modelId: string, answer: string) {
    if (!pending.current.has(modelId)) return;
    answers.current[modelId] = answer;
    pending.current.delete(modelId);
    if (pending.current.size > 0) return;
    if (selected.length >= 2) {
      const collected = selected.map((id) => ({ model: nameOf(id), text: answers.current[id]! }));
      consensus.sendMessage({ text: "consensus" }, { body: { userPrompt: lastPrompt, answers: collected } });
      setShowModels(false);
    } else if (signal && finalizedNonce.current !== signal.nonce) {
      finalizedNonce.current = signal.nonce;
      void finalize(undefined, lastPrompt);
    }
  }

  // once consensus finishes streaming, fold the whole turn into history + storage
  useEffect(() => {
    if (consensus.status !== "ready" || consensus.messages.length === 0 || !signal) return;
    if (finalizedNonce.current === signal.nonce) return;
    finalizedNonce.current = signal.nonce;
    void finalize(modelChatText(consensus.messages), lastPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consensus.status, consensus.messages]);

  const liveConsensus = modelChatText(consensus.messages);
  const hasLiveConsensus = consensus.messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* model picker — add via dropdown, remove via the × on each pill */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="text-muted-foreground mr-1 text-xs font-semibold uppercase tracking-wide">
          Models
        </span>
        <ModelMultiSelect models={models} selected={selected} onChange={setSelected} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 p-4">
          {/* saved history */}
          {history.map((t, i) => (
            <div key={i} className="space-y-3">
              <div className="text-right">
                <span className="bg-secondary inline-block rounded-2xl px-3 py-2 text-left text-sm">
                  {t.prompt}
                </span>
              </div>
              {t.consensus && <ConsensusBox text={t.consensus} />}
              <details className="group">
                <summary className="text-muted-foreground hover:text-foreground mb-2 flex cursor-pointer list-none items-center gap-1 text-xs font-medium">
                  <ChevronDownIcon className="size-3.5 transition-transform group-open:rotate-0 -rotate-90" />
                  {t.answers.length} model answers
                </summary>
                <div className="space-y-3">
                  {t.answers.map((a) => (
                    <div key={a.modelId} className="rounded-xl border">
                      <div className="text-muted-foreground border-b px-3 py-1.5 text-xs font-semibold">
                        {a.model}
                      </div>
                      <div className="p-3 text-sm">
                        <MessageResponse>{a.text}</MessageResponse>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}

          {/* live, in-flight turn */}
          {signal && (
            <div className="space-y-3">
              <div className="text-right">
                <span className="bg-secondary inline-block rounded-2xl px-3 py-2 text-left text-sm">
                  {lastPrompt}
                </span>
              </div>
              {hasLiveConsensus && <ConsensusBox text={liveConsensus} />}
              {hasLiveConsensus && (
                <button
                  type="button"
                  onClick={() => setShowModels((v) => !v)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
                >
                  <ChevronDownIcon className={cn("size-3.5 transition-transform", !showModels && "-rotate-90")} />
                  {showModels ? "Hide" : "Show"} {selected.length} model answers
                </button>
              )}
              {showModels && (
                <div className="space-y-3">
                  {selected.map((id) => (
                    <div key={id} className="rounded-xl border">
                      <div className="text-muted-foreground border-b px-3 py-1.5 text-xs font-semibold">
                        {nameOf(id)}
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

      {/* composer — same rich composer as the main chat page */}
      <div className="w-full p-4">
        <SuperComposer
          placeholder={selected.length ? `Ask ${selected.length} models…` : "Pick at least one model"}
          submitDisabled={selected.length === 0}
          onSubmit={send}
        />
      </div>
    </div>
  );
}
