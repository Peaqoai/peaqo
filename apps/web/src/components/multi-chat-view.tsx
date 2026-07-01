"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  SparklesIcon,
  PlusIcon,
  XIcon,
  Minimize2 as MinimizeIcon,
  Maximize2 as MaximizeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { MessageResponse } from "@peaqo/ui/components/ai-elements/message";
import { Switch } from "@peaqo/ui/components/switch";
import { cn } from "@peaqo/ui/lib/utils";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { config } from "@peaqo/trpc/config";
import {
  ModelChat,
  modelChatText,
  turnsToMessages,
  type SendSignal,
  type SuperSession,
} from "@/components/model-chat";
import { ChatModelSelector, ModelLogo, type ChatModel } from "@/components/chat-model-selector";
import { SuperComposer, type ComposerSubmit } from "@/components/super-composer";

const MAX_COLUMNS = 10;

export function MultiChatView({ session }: { session: SuperSession }) {
  const { data: authSession } = authClient.useSession();
  const modelsQuery = trpc.models.listEnabled.useQuery();
  const models: ChatModel[] =
    modelsQuery.data && modelsQuery.data.length > 0
      ? modelsQuery.data.map((m) => ({ id: m.modelId, name: m.displayName, provider: m.provider }))
      : [config.fallbackModel];

  const nameOf = (id: string) => models.find((m) => m.id === id)?.name ?? id;

  // seed columns from a saved session, else 3 distinct models
  const [columns, setColumns] = useState(() =>
    session?.models.length
      ? session.models.map((m, i) => ({ key: i, modelId: m.modelId, enabled: m.enabled, collapsed: false }))
      : models.slice(0, 3).map((m, i) => ({ key: i, modelId: m.id, enabled: true, collapsed: false })),
  );
  const [nextKey, setNextKey] = useState(columns.length);
  const [signal, setSignal] = useState<SendSignal>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [convId, setConvId] = useState<string | null>(session?.id ?? null);

  const consensus = useChat({ transport: new DefaultChatTransport({ api: "/api/consensus" }) });

  const saveTurn = trpc.conversation.saveSuperTurn.useMutation();
  const saveConsensus = trpc.conversation.setSuperConsensus.useMutation();
  const utils = trpc.useUtils();

  // seed each column's thread once from the saved session (keyed by modelId)
  const initialFor = (modelId: string) =>
    session ? turnsToMessages(session.turns, modelId) : undefined;

  // per-broadcast bookkeeping so we persist a turn once all enabled models reply
  const pending = useRef<Set<string>>(new Set());
  const answers = useRef<Record<string, string>>({});

  function send(p: ComposerSubmit) {
    const t = p.text.trim();
    if (!t) return;
    consensus.setMessages([]);
    setAnswerMap({});
    setLastPrompt(t);
    pending.current = new Set(columns.filter((c) => c.enabled).map((c) => c.modelId));
    answers.current = {};
    setSignal({ text: t, nonce: Date.now(), files: p.files, webSearch: p.webSearch, personaId: p.personaId });
  }

  async function persistTurn() {
    if (!authSession?.user) return; // logged-out sessions stay ephemeral
    const enabledIds = columns.filter((c) => c.enabled).map((c) => c.modelId);
    const turn = {
      prompt: lastPrompt,
      answers: enabledIds.map((id) => ({ modelId: id, model: nameOf(id), text: answers.current[id] ?? "" })),
    };
    try {
      const res = await saveTurn.mutateAsync({
        id: convId ?? undefined,
        mode: "multi-chat",
        models: columns.map((c) => ({ modelId: c.modelId, enabled: c.enabled })),
        title: lastPrompt,
        turn,
      });
      if (!convId) {
        setConvId(res.id);
        window.history.replaceState(null, "", `/chat/multi/${res.id}`);
      }
      utils.conversation.list.invalidate();
    } catch {
      /* non-fatal: keep the live session even if the save fails */
    }
  }

  function onComplete(modelId: string, answer: string) {
    setAnswerMap((a) => ({ ...a, [modelId]: answer }));
    if (pending.current.has(modelId)) {
      answers.current[modelId] = answer;
      pending.current.delete(modelId);
      if (pending.current.size === 0) void persistTurn();
    }
  }

  // patch consensus onto the saved turn once it finishes streaming
  const savedConsensus = useRef(0);
  useEffect(() => {
    if (consensus.status !== "ready" || consensus.messages.length === 0 || !convId) return;
    const text = modelChatText(consensus.messages);
    if (text && savedConsensus.current !== consensus.messages.length) {
      savedConsensus.current = consensus.messages.length;
      saveConsensus.mutate({ id: convId, consensus: text });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consensus.status, consensus.messages, convId]);

  function generateConsensus() {
    const enabledIds = columns.filter((c) => c.enabled).map((c) => c.modelId);
    const collected = enabledIds
      .map((id) => ({ model: nameOf(id), text: answerMap[id] }))
      .filter((a) => a.text);
    if (collected.length < 2) {
      toast.error("Need at least 2 answers for consensus");
      return;
    }
    consensus.setMessages([]);
    savedConsensus.current = 0;
    consensus.sendMessage({ text: "consensus" }, { body: { userPrompt: lastPrompt, answers: collected } });
  }

  function setColumnModel(key: number, modelId: string) {
    setColumns((cs) => cs.map((c) => (c.key === key ? { ...c, modelId } : c)));
  }
  function toggleEnabled(key: number) {
    // disabling auto-minimizes; re-enabling expands again
    setColumns((cs) =>
      cs.map((c) => (c.key === key ? { ...c, enabled: !c.enabled, collapsed: c.enabled } : c)),
    );
  }
  function toggleCollapsed(key: number) {
    setColumns((cs) => cs.map((c) => (c.key === key ? { ...c, collapsed: !c.collapsed } : c)));
  }
  function addColumn() {
    if (columns.length >= MAX_COLUMNS) return;
    const used = new Set(columns.map((c) => c.modelId));
    const next = models.find((m) => !used.has(m.id)) ?? models[0]!;
    setColumns((cs) => [...cs, { key: nextKey, modelId: next.id, enabled: true, collapsed: false }]);
    setNextKey((k) => k + 1);
  }
  function removeColumn(key: number) {
    setColumns((cs) => (cs.length <= 1 ? cs : cs.filter((c) => c.key !== key)));
  }

  const consensusText = modelChatText(consensus.messages);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 divide-x overflow-x-auto">
        {columns.map((col) => {
          const m = models.find((x) => x.id === col.modelId);
          const removeBtn = columns.length > 1 && (
            <button
              type="button"
              onClick={() => removeColumn(col.key)}
              aria-label="Remove column"
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          );
          return (
            <div
              key={col.key}
              className={cn(
                "flex min-h-0 flex-col",
                col.collapsed ? "w-12 shrink-0 items-center gap-2 py-2" : "min-w-64 flex-1",
              )}
            >
              {col.collapsed ? (
                <>
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(col.key)}
                    aria-label={`Expand ${m?.name ?? "model"}`}
                    title={m?.name}
                    className={cn(!col.enabled && "opacity-40")}
                  >
                    {m && <ModelLogo provider={m.provider} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(col.key)}
                    aria-label="Expand column"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <MaximizeIcon className="size-4" />
                  </button>
                  {removeBtn}
                </>
              ) : (
                <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                  <ChatModelSelector
                    value={col.modelId}
                    onChange={(id) => setColumnModel(col.key, id)}
                    models={models}
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={col.enabled}
                      onCheckedChange={() => toggleEnabled(col.key)}
                      aria-label="Include this model"
                    />
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(col.key)}
                      aria-label="Minimize column"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <MinimizeIcon className="size-4" />
                    </button>
                    {removeBtn}
                  </div>
                </div>
              )}
              <div className={cn("min-h-0 flex-1", col.collapsed && "hidden")}>
                <ModelChat
                  modelId={col.modelId}
                  models={models}
                  enabled={col.enabled}
                  signal={signal}
                  onComplete={onComplete}
                  showHeader={false}
                  initialMessages={initialFor(col.modelId)}
                />
              </div>
            </div>
          );
        })}
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
        <SuperComposer
          placeholder="Message all models…"
          onSubmit={send}
          leading={
            <button
              type="button"
              onClick={generateConsensus}
              className="hover:bg-accent flex h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
            >
              <SparklesIcon className="size-4" /> Consensus
            </button>
          }
        />
      </div>
    </div>
  );
}
