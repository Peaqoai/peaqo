# Super AI: Multi-Model Modes (Super Fiesta + Multi Chat)

Date: 2026-06-30
Status: Approved design, pending plan

## Goal

Replace the prototype `Fiesta` mode with a real multi-model experience under a
sidebar entry **Super AI**. The Super AI page has a mode dropdown (matching
screenshot 1) switching between two sub-modes:

- **Super Fiesta** — pick multiple models, fan out the same prompt, stream each
  answer, then auto-merge into ONE consensus answer. Individual answers collapse
  (still expandable); the consensus is the kept result.
- **Multi Chat** — N side-by-side columns (cap 4), one model each, freely
  swappable from any enabled model, per-column on/off toggle. One shared
  composer sends to all enabled columns. Optional "Generate Consensus" button.

## Key insight: almost no backend change

The existing `POST /api/chat` already streams a single model and treats
`conversationId` as optional. Missing `conversationId` → ephemeral (no DB
write). So multi-model fan-out is just **N parallel `useChat` instances**, each
bound to the same endpoint with a different `modelId` and no `conversationId`.
No new fan-out route, no streaming changes.

## Architecture

### Frontend

Route: rename `apps/web/src/app/(app)/fiesta/` → `(app)/super-ai/`.
Sidebar `CHAT_MODES`: `Fiesta` label → `Super AI`, route `/fiesta` → `/super-ai`.

`super-ai/page.tsx` holds the mode dropdown + shared model-selection state, and
renders one of:

- `<SuperFiestaView>` — multi-select model picker, single composer. On send:
  spawn one ephemeral `useChat` per selected model, stream all in a stacked
  list. When **all** finish, POST to `/api/consensus` and render the merged
  answer as the primary result; collapse individuals into an expandable
  "model answers" section.
- `<MultiChatView>` — a horizontal grid of `<ModelColumn>`. Each column owns one
  ephemeral `useChat` (its own `modelId`), a model dropdown (reuse
  `chat-model-selector` logic), and an enable toggle. Shared bottom composer
  appends the user message to every enabled column and triggers their sends.
  "Generate Consensus" → `/api/consensus` over the enabled columns' latest
  answers, shown in a consensus panel.

`<ModelColumn>` is the reusable unit: props `{ modelId, onModelChange, enabled,
messages, status }`; renders header (model dropdown + toggle), the column thread
(reuse existing `MessagePart` rendering), per-message copy/feedback. It does NOT
own fan-out orchestration — the parent does — so columns stay independently
testable.

### Backend: one new route

`POST /api/consensus` (added to the existing Hono app in
`api/[[...route]]/route.ts`):

- Body: `{ userPrompt: string, answers: { model: string; text: string }[],
  conversationId?: string }`
- Resolves a **fixed** `CONSENSUS_MODEL` (new constant alongside `TITLE_MODEL`
  in `packages/trpc/src/llm/resolve.ts` or `models.ts`).
- System prompt: "You are a synthesis assistant. Below are answers from several
  AI models to the same question. Produce one best combined answer, resolving
  disagreements and keeping the strongest points. Do not mention the individual
  models." User content carries the prompt + labeled answers.
- Streams via `streamText().toUIMessageStreamResponse()` exactly like `/chat`.
- Credit accounting + optional persistence reuse the same `onFinish` pattern as
  `/chat`. Keeping the consensus model server-side means it is never exposed to
  the client.

The fan-out `/api/chat` calls each cost credits (N models) — expected, no change.

### Persistence (v1)

- Super Fiesta: fan-out answers are **ephemeral** (no `conversationId`). The
  consensus call MAY pass a `conversationId` to persist the consensus as a
  normal assistant message — reuses existing conversation schema, no migration.
- Multi Chat: fully ephemeral comparison. No persistence v1.

`ponytail:` deferred — durable multi-thread Multi Chat history and saved
Super Fiesta sessions are out of scope v1. Add a schema for it only if users ask
to revisit comparisons. The message `variants[]` field (already model-tagged)
is the natural future home for Super Fiesta's per-model answers.

## Components / files touched

| File | Change |
|------|--------|
| `apps/web/src/app/(app)/fiesta/` → `super-ai/page.tsx` | Rename dir; new dropdown shell |
| `apps/web/src/components/super-fiesta-view.tsx` | New — multi-select + fan-out + consensus |
| `apps/web/src/components/multi-chat-view.tsx` | New — column grid + shared composer |
| `apps/web/src/components/model-column.tsx` | New — single reusable column |
| `apps/web/src/components/app-sidebar.tsx` | `Fiesta`→`Super AI`, route update |
| `apps/web/src/app/api/[[...route]]/route.ts` | Add `POST /api/consensus` |
| `packages/trpc/src/llm/resolve.ts` (or `models.ts`) | Add `CONSENSUS_MODEL` const |

## Error handling

- A fan-out model that errors: that column/answer shows an inline error and is
  excluded from consensus; consensus proceeds with the rest. Super Fiesta needs
  ≥2 successful answers to offer consensus; with <2 it shows the single answer.
- Out of credits (402) mid fan-out: stop remaining sends, surface the existing
  out-of-credits prompt.
- Consensus needs ≥2 answers; the "Generate Consensus" button disables otherwise.

## Testing

- `model-column` renders given a fixed messages array (header + thread + actions).
- Consensus prompt builder: assert it includes every answer's text and the user
  prompt, and that <2 answers is rejected (the one runnable check per
  ponytail — the only non-trivial pure logic).
- Manual: verify fan-out streams N columns, consensus merges, credits deducted
  per model.

## Out of scope (v1)

- Persisted/resumable Multi Chat threads.
- User-selectable consensus model (fixed for now).
- Per-column independent follow-up divergence beyond shared-composer sends.
