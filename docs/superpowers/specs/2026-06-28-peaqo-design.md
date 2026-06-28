# Peaqo — Multi-LLM Chat App Design

**Date:** 2026-06-28

## Overview

A multi-LLM chat SaaS built on a Turborepo monorepo. Users sign up, pick a plan, and chat with any of OpenAI, Anthropic, Google Gemini, Groq, OpenRouter, or Cloudflare Workers AI models. Conversations are persisted to MongoDB. Access is gated by a credits/subscription model with three tiers: Free, Pro, and Team.

---

## Monorepo Structure

```
peaqo/
├── apps/
│   └── web/                          # Next.js 15 (App Router)
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/            # Login page
│       │   │   └── register/         # Registration page
│       │   ├── onboarding/           # Multi-step onboarding (post-verification)
│       │   └── (app)/                # Publicly accessible, actions auth-gated
│       │       └── chat/             # Guest can view; auth modal on any action
│       │   └── admin/                # Admin-only panel
│       │       └── models/           # Manage available models per provider
│       └── app/api/[[...route]]/     # Hono entry point
│           └── route.ts
├── packages/
│   ├── ui/                           # Shared shadcn/ui components
│   ├── db/                           # MongoDB models + Zod schemas
│   ├── auth/                         # better-auth config + session helpers
│   ├── trpc/                         # tRPC router + procedures
│   └── email/                        # React Email templates
└── turbo.json
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo |
| Frontend | Next.js 15 (App Router) |
| UI components | shadcn/ui |
| Server state | React Query (TanStack Query v5) + AI SDK `useChat` for chat streams |
| API layer | Hono (mounted in Next.js API route) |
| RPC | tRPC v11 over Hono |
| Auth | better-auth |
| Validation | Zod |
| Database | MongoDB (via Mongoose) |
| Email templates | React Email |
| Email sending | Resend |

---

## Data Flow

```
Browser
  └─ React Query
       └─ tRPC client
            └─ POST /api/trpc/*  (Hono handler in Next.js)
                 └─ tRPC server (auth middleware)
                      ├─ packages/db  (MongoDB)
                      └─ LLM APIs (OpenAI / Anthropic / Gemini / Groq / OpenRouter / Cloudflare Workers AI)
```

---

## Authentication Flow

### Guest Access
- `/app/chat` is publicly accessible — no login required to view
- Guests can browse the UI, see model options, and read any public content
- Any **action** (send message, create conversation, etc.) triggers an **auth gate modal** — a login/register popup appears inline
- After completing login/register in the modal, the original action resumes automatically
- Guest sessions have no persistence — nothing is saved

### Registered User Flow
1. User registers at `/register` (email + password)
2. Resend sends a verification email (React Email template)
3. User clicks verification link → better-auth validates token
4. Redirect to `/onboarding`
5. Onboarding completed → redirect to `/app/chat`
6. Returning user logs in at `/login` → redirect to `/app/chat`

---

## Onboarding Flow (multi-step)

**Step 1 — Profile**
- Display name (required)
- Avatar upload (optional)

**Step 2 — Plan Selection**
- Free: monthly token budget (small)
- Pro: larger monthly token budget
- Team: org-level budget + member management

**Step 3 — Team Setup** *(Team plan only)*
- Organisation name
- Invite members by email (sends invite via Resend)

On completion, `user.onboardingComplete` is set to `true` and user is redirected to `/app/chat`.

---

## Data Models (MongoDB + Zod)

### User
```ts
{
  _id: ObjectId,
  email: string,
  name: string,
  avatarUrl?: string,
  plan: "free" | "pro" | "ultimate" | "team",
  role: "user" | "admin",
  orgId?: ObjectId,           // set if plan === "team"
  onboardingComplete: boolean,
  creditsUsed: number,        // current period usage
  creditsLimit: number,       // set by plan (free=10, pro=2000, team=TBD)
  createdAt: Date,
}
```

### Organisation
```ts
{
  _id: ObjectId,
  name: string,
  ownerId: ObjectId,
  members: ObjectId[],
  createdAt: Date,
}
```

### Conversation
```ts
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,
  model: string,             // e.g. "gpt-4o", "claude-opus-4-8"
  provider: "openai" | "anthropic" | "google" | "groq" | "openrouter" | "cloudflare",
  messages: Message[],
  createdAt: Date,
  updatedAt: Date,
}
```

### Message
```ts
{
  role: "user" | "assistant",
  content: string,
  tokenCount: number,
  createdAt: Date,
}
```

---

## LLM Providers

**Vercel AI SDK** (`ai`) handles all providers via a unified interface — no individual provider SDKs needed.

All API calls route through **Cloudflare AI Gateway** — configured per model via the `Gateway` collection. AI SDK supports a custom `baseURL` per provider for this.

| Provider | AI SDK package | Model list API |
|---|---|---|
| OpenAI | `@ai-sdk/openai` | `GET /v1/models` |
| Anthropic | `@ai-sdk/anthropic` | Seeded list (no public API) |
| Google Gemini | `@ai-sdk/google` | `GET /v1beta/models` |
| Groq | `@ai-sdk/groq` | `GET /openai/v1/models` |
| OpenRouter | `@openrouter/ai-sdk-provider` | `GET /api/v1/models` |
| Cloudflare Workers AI | `@ai-sdk/cloudflare` | `GET /accounts/{id}/ai/models/search` |

**Server:** `streamText()` from `ai` powers streaming responses in Hono route handlers. Token usage is read from the stream result to deduct credits.

**Client:** `useChat()` from `ai/react` handles streaming state, message list, and input — minimal custom UI state needed. AI SDK UI elements (loading states, stop button) used where applicable.

---

## Email Templates (React Email)

1. **Verification email** — confirms email on registration
2. **Team invite email** — invites a new member to an org

---

## Admin Panel

Route: `/admin/models` — accessible only to users with `role: "admin"`.

**Model management flow:**
1. Admin selects a **provider** (OpenAI / Anthropic / Google / Groq)
2. Admin selects a **Cloudflare AI Gateway** to route this provider through (dropdown of configured gateways)
3. App calls the provider's API (via the selected gateway) to fetch their current model list dynamically
4. Admin toggles which models are enabled/disabled for users and sets each model's **credit multiplier**
5. Enabled models are stored in MongoDB (`Model` collection) with their provider + gateway binding + multiplier
6. Chat UI reads from the `Model` collection — only shows enabled models; each request routes through the model's assigned gateway

**Provider model list endpoints (fetched server-side):**

| Provider | API to list models |
|---|---|
| OpenAI | `GET /v1/models` via `@ai-sdk/openai` |
| Anthropic | Static list (no public list API) — fetched from Anthropic docs or hardcoded seed |
| Google Gemini | `GET /v1beta/models` via `@ai-sdk/google` |
| Groq | `GET /openai/v1/models` via Groq API |

Anthropic has no public model listing API — the admin UI will show a pre-seeded list that can be manually supplemented.

### Gateway (MongoDB)
Admin-configured Cloudflare AI Gateway entries. Multiple gateways can exist (e.g. one per provider, or one shared).
```ts
{
  _id: ObjectId,
  name: string,          // e.g. "CF Gateway - OpenAI"
  url: string,           // Cloudflare AI Gateway base URL
  createdAt: Date,
}
```

### Model (MongoDB)
```ts
{
  _id: ObjectId,
  provider: "openai" | "anthropic" | "google" | "groq" | "openrouter" | "cloudflare",
  gatewayId: ObjectId,   // ref → Gateway
  modelId: string,       // e.g. "gpt-4o", "claude-opus-4-8"
  displayName: string,
  creditMultiplier: number,  // e.g. 1.0 = base, 3.0 = premium model costs 3x credits
  enabled: boolean,
  createdAt: Date,
}
```

## tRPC Routers

- `auth` — register, login, verify (delegates to better-auth)
- `user` — getMe, updateProfile
- `onboarding` — completeProfile, selectPlan, setupTeam
- `chat` — createConversation, sendMessage (streaming), listConversations
- `org` — create, inviteMember, listMembers
- `admin.models` — listFromProvider (live API fetch), listEnabled, toggleModel
- `admin.gateways` — create, list, delete (manage CF AI Gateway entries)

---

## Subscription Tiers

**Credit rate:** 1 credit = 1,000 tokens

| Tier | Price | Credits/month | Token equivalent | Team Features |
|---|---|---|---|---|
| Free | $0 | 10 | 10,000 tokens | No |
| Pro | $19/mo | 2,000 | 2,000,000 tokens | Yes (org + members) |
| Ultimate | $49/mo | 6,000 | 6,000,000 tokens | Yes (org + members) |

> Prices are approximate and subject to change. Blended API cost across providers is ~$0.002–0.005 per 1k tokens; margins above reflect hosting + gateway overhead.

- **Pro and Ultimate both include team features** — org creation, member invites, shared credit pool
- Ultimate adds 3× the credits of Pro plus priority model access
- Credits are deducted per message: `ceil((tokensUsed / 1000) * model.creditMultiplier)`
  - Base: 1 credit = 1,000 tokens (multiplier 1.0)
  - A premium model with multiplier 3.0 deducts 3× — e.g. 1,000 tokens = 3 credits
- The multiplier is set per-model by the admin (reflects that model's real API cost)
- If `creditsUsed >= creditsLimit`, further messages are blocked until next billing period

Stripe integration is **out of scope** for this spec. `plan` and `creditsLimit` are set manually or mocked for now.

---

## Out of Scope (this spec)

- Stripe / payment processing
- BYOK (bring your own API keys)
- Message search
- Conversation export
- Admin dashboard
