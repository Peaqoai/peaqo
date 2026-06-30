# Super AI Multi-Model Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the prototype `Fiesta` mode with a real multi-model **Super AI** page containing two sub-modes — **Super Fiesta** (fan out a prompt to N models, then auto-merge into one consensus answer) and **Multi Chat** (up to 4 side-by-side model columns with a shared composer).

**Architecture:** Fan-out reuses the existing `POST /api/chat` endpoint, which already treats `conversationId` as optional — so each model gets its own ephemeral `useChat` instance. A single small new route, `POST /api/consensus`, streams a merged answer from a fixed model. One reusable `ModelChat` component owns one `useChat` + one model; the two views orchestrate sends by bumping a shared `nonce` that each column reacts to.

**Tech Stack:** Next.js (App Router), React, `@ai-sdk/react` `useChat`, Vercel AI SDK `streamText`, Hono route handler, tRPC, Tailwind, vitest.

## Global Constraints

- Lint is `eslint --max-warnings 0` across all packages; the build must stay green (`pnpm build`, `pnpm lint`, `pnpm check-types` via Turbo).
- Reuse existing UI primitives from `@peaqo/ui` and existing components (`ChatModelSelector`, `MessageResponse`, `PromptInput*`). Do not add new dependencies.
- Models come from `trpc.models.listEnabled` mapped to `{ id, name, provider }`. Never hardcode the model list in the UI.
- Multi-model fan-out calls carry **no** `conversationId` (ephemeral, not persisted). Only the consensus call may persist later — v1 does not persist anything.
- The consensus model is fixed server-side (`config.consensusModel`) and never exposed to the client.
- Match existing file style: `"use client"` on client components, `cn()` for class merging, `brand-gradient` for primary action buttons.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `packages/trpc/src/config.ts` | Add `consensusModel` id (modify) |
| `packages/trpc/src/consensus-prompt.ts` | Pure builder for the consensus user prompt + system string (create) |
| `packages/trpc/src/consensus-prompt.test.ts` | vitest for the builder (create) |
| `apps/web/src/app/api/[[...route]]/route.ts` | Add `POST /api/consensus` (modify) |
| `apps/web/src/components/app-sidebar.tsx` | `Fiesta` → `Super AI`, `/fiesta` → `/super-ai` (modify) |
| `apps/web/src/app/(app)/fiesta/page.tsx` | **Delete** (prototype removed) |
| `apps/web/src/app/(app)/super-ai/page.tsx` | Page shell: mode dropdown + renders the two views (create) |
| `apps/web/src/components/model-chat.tsx` | Reusable single-model column (`useChat` + header + thread) (create) |
| `apps/web/src/components/multi-chat-view.tsx` | Column grid + shared composer + Generate Consensus (create) |
| `apps/web/src/components/super-fiesta-view.tsx` | Multi-select + fan-out + auto consensus + collapse (create) |

---

## Task 1: Consensus prompt builder (pure logic + test)

**Files:**
- Create: `packages/trpc/src/consensus-prompt.ts`
- Test: `packages/trpc/src/consensus-prompt.test.ts`

**Interfaces:**
- Produces:
  - `type ModelAnswer = { model: string; text: string }`
  - `buildConsensusPrompt(userPrompt: string, answers: ModelAnswer[]): string` — throws `Error("consensus needs at least 2 answers")` when `answers.length < 2`.
  - `const CONSENSUS_SYSTEM: string`

- [ ] **Step 1: Write the failing test**

Create `packages/trpc/src/consensus-prompt.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildConsensusPrompt, CONSENSUS_SYSTEM } from "./consensus-prompt";

describe("buildConsensusPrompt", () => {
  it("includes the user prompt and every answer's text", () => {
    const out = buildConsensusPrompt("What is 2+2?", [
      { model: "GPT-4o", text: "It is 4." },
      { model: "Gemini", text: "The answer is four." },
    ]);
    expect(out).toContain("What is 2+2?");
    expect(out).toContain("It is 4.");
    expect(out).toContain("The answer is four.");
    expect(out).toContain("GPT-4o");
    expect(out).toContain("Gemini");
  });

  it("rejects fewer than 2 answers", () => {
    expect(() => buildConsensusPrompt("hi", [{ model: "GPT-4o", text: "hello" }])).toThrow(
      /at least 2/,
    );
  });

  it("exposes a synthesis system prompt", () => {
    expect(CONSENSUS_SYSTEM).toContain("synthesis");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @peaqo/trpc test consensus-prompt`
Expected: FAIL — cannot find module `./consensus-prompt`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/trpc/src/consensus-prompt.ts`:

```ts
// Builds the input for the consensus pass: one model reads every model's answer
// and writes a single merged reply. Pure + testable; the route wires it to streamText.
export type ModelAnswer = { model: string; text: string };

export const CONSENSUS_SYSTEM =
  "You are a synthesis assistant. Below are answers from several AI models to the " +
  "same question. Produce one best combined answer, resolving disagreements and " +
  "keeping the strongest points. Do not mention the individual models or that you " +
  "are merging answers — just give the final answer.";

export function buildConsensusPrompt(userPrompt: string, answers: ModelAnswer[]): string {
  if (answers.length < 2) throw new Error("consensus needs at least 2 answers");
  const blocks = answers
    .map((a, i) => `### Answer ${i + 1} (${a.model})\n${a.text}`)
    .join("\n\n");
  return `User question:\n${userPrompt}\n\nAnswers from different AI models:\n\n${blocks}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @peaqo/trpc test consensus-prompt`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/trpc/src/consensus-prompt.ts packages/trpc/src/consensus-prompt.test.ts
git commit -m "feat(trpc): consensus prompt builder"
```

---

## Task 2: `POST /api/consensus` route + config constant

**Files:**
- Modify: `packages/trpc/src/config.ts`
- Modify: `apps/web/src/app/api/[[...route]]/route.ts`

**Interfaces:**
- Consumes: `buildConsensusPrompt`, `CONSENSUS_SYSTEM` (Task 1); `getModel`, `getGateway`, `resolveModel`, `creditsFor`, `canAfford`, `shouldResetCredits`, `getSession`, `connectDB`, `UserModel` (existing).
- Produces: HTTP `POST /api/consensus` — body `{ userPrompt: string; answers: { model: string; text: string }[]; conversationId?: string }` → a UI message stream (same shape as `/api/chat`). Errors: 401 unauth, 402 out of credits, 400 if `<2` answers or consensus model misconfigured.

- [ ] **Step 1: Add the config constant**

In `packages/trpc/src/config.ts`, add inside the `config` object (after `titleModel`):

```ts
  // model that merges multi-model answers into one consensus reply (Super Fiesta)
  consensusModel: "gpt-4o",
```

- [ ] **Step 2: Add imports to the route**

In `apps/web/src/app/api/[[...route]]/route.ts`, extend the existing imports. Add `config` and the consensus helpers:

```ts
import { config } from "@peaqo/trpc/config";
import { buildConsensusPrompt, CONSENSUS_SYSTEM } from "@peaqo/trpc/consensus-prompt";
```

(`streamText`, `getSession`, `connectDB`, `UserModel`, `getModel`, `getGateway`, `resolveModel`, `creditsFor`, `canAfford`, `shouldResetCredits` are already imported in this file.)

- [ ] **Step 3: Add the route handler**

In the same file, immediately **after** the `app.post("/chat", ...)` handler closes (after its `});` near line 191) and before `export const GET`/`POST` wiring at the bottom, insert:

```ts
app.post("/consensus", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  await connectDB();
  const { userPrompt, answers } = (await c.req.json()) as {
    userPrompt: string;
    answers: { model: string; text: string }[];
    conversationId?: string;
  };

  const user = await UserModel.findById(session.userId);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (shouldResetCredits(user.creditsResetAt)) {
    user.creditsUsed = 0;
    user.creditsResetAt = new Date();
  }
  if (!canAfford(user)) return c.json({ error: "Out of credits" }, 402);

  const cfg = getModel(config.consensusModel);
  if (!cfg) return c.json({ error: "Consensus model not configured" }, 400);
  const gateway = getGateway(cfg.gatewayId);
  if (!gateway) return c.json({ error: "Gateway not configured" }, 400);

  let prompt: string;
  try {
    prompt = buildConsensusPrompt(userPrompt, answers ?? []);
  } catch {
    return c.json({ error: "Need at least 2 answers" }, 400);
  }

  const model = resolveModel({
    provider: cfg.provider,
    modelId: config.consensusModel,
    gatewayUrl: gateway.url,
  });
  const multiplier = cfg.creditMultiplier ?? 1;
  const minCredits = cfg.minCredits ?? 1;
  const startedAt = Date.now();

  const result = streamText({
    model,
    system: CONSENSUS_SYSTEM,
    prompt,
    onFinish: async ({ usage }) => {
      const credits = creditsFor(usage.totalTokens ?? 0, multiplier, minCredits);
      user.creditsUsed += credits;
      await user.save();
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) =>
      part.type === "finish"
        ? { model: cfg.displayName, durationMs: Date.now() - startedAt }
        : undefined,
  });
});
```

- [ ] **Step 4: Verify it type-checks and builds**

Run: `pnpm --filter @peaqo/web check-types`
Expected: PASS, no errors referencing `route.ts` or `consensus`.

- [ ] **Step 5: Commit**

```bash
git add packages/trpc/src/config.ts "apps/web/src/app/api/[[...route]]/route.ts"
git commit -m "feat(api): consensus route streaming a fixed merge model"
```

---

## Task 3: Sidebar rename + Super AI page shell

**Files:**
- Modify: `apps/web/src/components/app-sidebar.tsx`
- Modify: `apps/web/src/components/app-sidebar.tsx:58` (comment)
- Create: `apps/web/src/app/(app)/super-ai/page.tsx`
- Delete: `apps/web/src/app/(app)/fiesta/page.tsx`

**Interfaces:**
- Produces: route `/super-ai` rendering a mode switcher with two placeholder panels (`Super Fiesta`, `Multi Chat`). Tasks 5–6 fill the panels.

- [ ] **Step 1: Rename the sidebar mode + icon**

In `apps/web/src/components/app-sidebar.tsx`, change the import on line 18 from `PartyPopper as PartyIcon` to add a rocket icon:

```ts
    PartyPopper as PartyIcon,
    Rocket as RocketIcon,
```

Change the `CHAT_MODES` entry (line 125) from:

```ts
  { label: "Fiesta", href: "/fiesta", icon: PartyIcon },
```

to:

```ts
  { label: "Super AI", href: "/super-ai", icon: RocketIcon },
```

And update the routing comment on line 58:

```ts
  // /chat, /chat-history, /personas, /avatars, /super-ai are all "chat" modes
```

(`PartyIcon` may now be unused — remove its import line if lint flags it.)

- [ ] **Step 2: Create the page shell**

Create `apps/web/src/app/(app)/super-ai/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { RocketIcon, Columns3Icon, ChevronDownIcon } from "lucide-react";
import { cn } from "@peaqo/ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@peaqo/ui/components/dropdown-menu";
import { SuperFiestaView } from "@/components/super-fiesta-view";
import { MultiChatView } from "@/components/multi-chat-view";

type Mode = "super-fiesta" | "multi-chat";

const MODES: { id: Mode; label: string; icon: typeof RocketIcon; blurb: string }[] = [
  { id: "super-fiesta", label: "Super Fiesta", icon: RocketIcon, blurb: "One merged answer from many models" },
  { id: "multi-chat", label: "Multi Chat", icon: Columns3Icon, blurb: "Compare models side by side" },
];

export default function SuperAiPage() {
  const [mode, setMode] = useState<Mode>("super-fiesta");
  const current = MODES.find((m) => m.id === mode)!;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-accent flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold">
            <current.icon className="text-primary size-4" />
            {current.label}
            <ChevronDownIcon className="size-4 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {MODES.map((m) => (
              <DropdownMenuItem
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn("flex items-start gap-2", m.id === mode && "bg-accent")}
              >
                <m.icon className="text-primary mt-0.5 size-4" />
                <div>
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-muted-foreground text-xs">{m.blurb}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="min-h-0 flex-1">
        {mode === "super-fiesta" ? <SuperFiestaView /> : <MultiChatView />}
      </div>
    </div>
  );
}
```

> NOTE: `SuperFiestaView` and `MultiChatView` don't exist yet — Tasks 5 and 6 create them. To keep this task independently buildable, temporarily stub them:

Create `apps/web/src/components/super-fiesta-view.tsx` and `apps/web/src/components/multi-chat-view.tsx`, each with:

```tsx
"use client";
export function SuperFiestaView() {
  return <div className="text-muted-foreground p-8 text-sm">Super Fiesta — coming up.</div>;
}
```

(name the export `MultiChatView` in the other file accordingly).

- [ ] **Step 3: Delete the old prototype**

```bash
git rm apps/web/src/app/\(app\)/fiesta/page.tsx
```

- [ ] **Step 4: Verify dropdown component path**

Run: `ls packages/ui/src/components/dropdown-menu.tsx`
Expected: file exists. If the path differs, run `grep -rl "DropdownMenuTrigger" packages/ui/src/components | head -1` and use that import path instead.

- [ ] **Step 5: Build and verify the route loads**

Run: `pnpm --filter @peaqo/web check-types && pnpm --filter @peaqo/web lint`
Expected: PASS. (Manual: `pnpm dev`, open `/super-ai`, see the dropdown switch between two stub panels.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/app-sidebar.tsx apps/web/src/app/\(app\)/super-ai/page.tsx apps/web/src/components/super-fiesta-view.tsx apps/web/src/components/multi-chat-view.tsx
git add -u
git commit -m "feat(super-ai): sidebar rename + page shell with mode dropdown"
```

---

## Task 4: `ModelChat` reusable single-model column

**Files:**
- Create: `apps/web/src/components/model-chat.tsx`

**Interfaces:**
- Consumes: `useChat` from `@ai-sdk/react`, `DefaultChatTransport` from `ai`, `ChatModelSelector` + `ChatModel` from `@/components/chat-model-selector`, `MessageResponse` from `@peaqo/ui/components/ai-elements/message`.
- Produces:
  ```ts
  type SendSignal = { text: string; nonce: number } | null;
  function ModelChat(props: {
    modelId: string;
    models: ChatModel[];
    onModelChange?: (id: string) => void;     // omit -> model fixed (Super Fiesta)
    enabled?: boolean;                         // default true
    onToggle?: () => void;                     // omit -> no toggle shown
    signal: SendSignal;                        // bump nonce to send
    onComplete?: (modelId: string, text: string) => void;
    showHeader?: boolean;                      // default true
  }): JSX.Element
  ```
  Exposes `export function modelChatText(messages): string` helper (extract last assistant text) for reuse + testing.

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/model-chat.tsx`:

```tsx
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
      <div className={cn("flex-1 space-y-4 overflow-y-auto p-3 text-sm", !enabled && "opacity-40")}>
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
```

- [ ] **Step 2: Verify the Switch component path**

Run: `ls packages/ui/src/components/switch.tsx`
Expected: exists. If not, run `grep -rl "onCheckedChange" packages/ui/src/components | head -1` and adjust the import.

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @peaqo/web check-types`
Expected: PASS (the component is unused so far; this only checks it compiles).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/model-chat.tsx
git commit -m "feat(super-ai): reusable ModelChat column"
```

---

## Task 5: `MultiChatView` — columns + shared composer + consensus

**Files:**
- Modify: `apps/web/src/components/multi-chat-view.tsx` (replace the stub)

**Interfaces:**
- Consumes: `ModelChat`, `SendSignal`, `modelChatText` (Task 4); `trpc.models.listEnabled`; `DefaultChatTransport` + `useChat` for the consensus stream; `config.fallbackModel`.
- Produces: `export function MultiChatView()`.

- [ ] **Step 1: Replace the stub with the real view**

Overwrite `apps/web/src/components/multi-chat-view.tsx`:

```tsx
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
    setColumns((cs) => [...cs, { key: nextKey, modelId: models[0].id, enabled: true }]);
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

      {(consensus.status !== "ready" || consensusText) && consensus.messages.length > 0 && (
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
```

- [ ] **Step 2: Type-check + lint**

Run: `pnpm --filter @peaqo/web check-types && pnpm --filter @peaqo/web lint`
Expected: PASS. Fix any unused-import warnings (lint is zero-warnings).

- [ ] **Step 3: Manual smoke test**

Run `pnpm dev`, open `/super-ai` → Multi Chat. Type "hi", press Enter. Expected: each enabled column streams its model's reply; toggling a column off greys it; "Consensus" merges ≥2 answers into the consensus card.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/multi-chat-view.tsx
git commit -m "feat(super-ai): Multi Chat side-by-side columns with consensus"
```

---

## Task 6: `SuperFiestaView` — multi-select fan-out + auto consensus + collapse

**Files:**
- Modify: `apps/web/src/components/super-fiesta-view.tsx` (replace the stub)

**Interfaces:**
- Consumes: `ModelChat`, `SendSignal`, `modelChatText` (Task 4); `trpc.models.listEnabled`; consensus `useChat`; `config.fallbackModel`.
- Produces: `export function SuperFiestaView()`.

Behavior: user multi-selects models (chips). On send, fan out to all selected (each a headerless `ModelChat`), stream them in a stacked/collapsible list. When **all** selected report complete, auto-call `/api/consensus`. Once consensus streams, collapse the individual answers behind a "Show N model answers" toggle; consensus is the primary result. Needs ≥2 selected to enable consensus (with 1, just show the single answer, no consensus).

- [ ] **Step 1: Replace the stub with the real view**

Overwrite `apps/web/src/components/super-fiesta-view.tsx`:

```tsx
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
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [showModels, setShowModels] = useState(true);

  const consensus = useChat({ transport: new DefaultChatTransport({ api: "/api/consensus" }) });

  function toggleModel(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function send() {
    const t = text.trim();
    if (!t || selected.length === 0) return;
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
          text: next[id],
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
```

> NOTE on re-sends: `ModelChat` keys are stable per `modelId`, so a second prompt reuses the same `useChat` instances and appends turns. The `signal.nonce` change triggers each enabled column to send again; `answerMap` is reset on each `send()` so consensus recomputes from the new turn. Consensus fires only when `consensus.messages.length === 0` — for a *second* prompt you must clear the prior consensus. Add to `send()`: `consensus.setMessages([]);` (destructure `setMessages` from the `useChat` consensus hook).

- [ ] **Step 2: Apply the second-prompt fix**

Destructure `setMessages` from the consensus hook and clear it in `send()`:

```tsx
  const consensus = useChat({ transport: new DefaultChatTransport({ api: "/api/consensus" }) });
  // ...
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
```

- [ ] **Step 3: Type-check + lint**

Run: `pnpm --filter @peaqo/web check-types && pnpm --filter @peaqo/web lint`
Expected: PASS, zero warnings.

- [ ] **Step 4: Manual smoke test**

Run `pnpm dev`, open `/super-ai` → Super Fiesta. Select 3 models, send "Suggest a name for an AI app". Expected: 3 answers stream; when all finish, a Consensus card appears and the model answers collapse behind "Show 3 model answers". Send a second prompt: prior consensus clears, new fan-out + consensus runs.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/super-fiesta-view.tsx
git commit -m "feat(super-ai): Super Fiesta fan-out with auto consensus"
```

---

## Task 7: Full verification + cleanup

**Files:** none (verification only).

- [ ] **Step 1: Full build, lint, types, unit tests**

```bash
pnpm build && pnpm lint && pnpm check-types && pnpm --filter @peaqo/trpc test
```
Expected: all green; consensus-prompt tests pass.

- [ ] **Step 2: End-to-end manual check**

Run `pnpm dev`:
1. Sidebar shows **Super AI** (rocket), routes to `/super-ai`.
2. Dropdown switches Super Fiesta ↔ Multi Chat.
3. Multi Chat: add/remove columns (cap 4), per-column model swap + toggle, shared send, Generate Consensus.
4. Super Fiesta: multi-select, fan-out, auto consensus, collapse, second prompt resets.
5. Credits in the sidebar decrement after sends (each model + consensus costs credits).

- [ ] **Step 3: Confirm old route is gone**

Run: `test ! -e apps/web/src/app/\(app\)/fiesta && echo "fiesta removed"`
Expected: `fiesta removed`.

- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git add -A
git commit -m "chore(super-ai): verification pass" --allow-empty
```

---

## Self-Review Notes

- **Spec coverage:** sidebar rename (T3), Super Fiesta show-then-collapse (T6), Multi Chat any-enabled-model + cap 4 (T5), fixed consensus model server-side (T1/T2), ephemeral fan-out via optional `conversationId` (T4 sends no `conversationId`), ≥2-answers consensus guard (T1 throw + T5/T6 client guard), error handling for out-of-credits (existing 402 surfaced via toast in views — note: add a `consensus.onError`/column error toast if QA shows silent failures).
- **Deferred (per spec, out of scope v1):** persistence of Multi Chat threads and Super Fiesta sessions; user-selectable consensus model; per-column independent follow-ups beyond the shared composer.
- **Known ceiling (`ponytail:`):** `signal.nonce` fan-out + `answerMap` collection is the simplest mechanism that avoids dynamic `useChat` hook counts. If columns need independent histories/branching later, promote each column to its own persisted conversation.
