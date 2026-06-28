import { Hono } from "hono";
import { handle } from "hono/vercel";
import { trpcServer } from "@hono/trpc-server";
import { streamText, generateText, convertToModelMessages, type UIMessage } from "ai";
import { appRouter, createTRPCContext } from "@repo/trpc";
import {
  resolveModel,
  webSearchTools,
  canAfford,
  creditsFor,
  shouldResetCredits,
  TITLE_MODEL,
} from "@repo/trpc/llm/resolve";
import { getAuth, getSession } from "@repo/auth";
import { connectDB, UserModel, ConversationModel, ModelCfg } from "@repo/db";
import { getGateway } from "@repo/trpc/config";

const app = new Hono().basePath("/api");

app.on(["GET", "POST"], "/auth/*", (c) => getAuth().handler(c.req.raw));

app.use("/trpc/*", trpcServer({
  router: appRouter,
  createContext: (_opts, c) => createTRPCContext({ req: c.req.raw }),
}));

app.post("/chat", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401); // guest -> client opens auth modal

  await connectDB();
  const { modelId, messages, conversationId, webSearch } = (await c.req.json()) as {
    modelId: string;
    messages: UIMessage[];
    conversationId?: string;
    webSearch?: boolean;
  };

  const user = await UserModel.findById(session.userId);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (shouldResetCredits(user.creditsResetAt)) {
    user.creditsUsed = 0;
    user.creditsResetAt = new Date();
  }
  if (!canAfford(user)) return c.json({ error: "Out of credits" }, 402);

  const cfg = await ModelCfg.findOne({ modelId, enabled: true });
  if (!cfg) return c.json({ error: "Model not available" }, 400);
  const gateway = getGateway(cfg.gatewayId);
  if (!gateway) return c.json({ error: "Gateway not configured" }, 400);

  const model = resolveModel({
    provider: cfg.provider,
    modelId,
    gatewayUrl: gateway.url,
  });

  const textOf = (m?: UIMessage) =>
    m?.parts?.map((p) => ("text" in p ? p.text : "")).join("") ?? "";
  const userText = textOf(messages[messages.length - 1]);

  const modelMessages = await convertToModelMessages(messages);
  const startedAt = Date.now();
  const result = streamText({
    model,
    messages: modelMessages,
    tools: webSearch ? webSearchTools(cfg.provider) : undefined,
    onFinish: async ({ text, usage }) => {
      let tokens = usage.totalTokens ?? 0;
      // first turn -> generate a concise title with TITLE_MODEL (best-effort).
      // Its tokens are folded into this turn's total so credits cover all usage.
      let set: { title?: string } = {};
      if (conversationId && messages.length <= 1) {
        let title = userText.slice(0, 60) || "New chat";
        try {
          const gen = await generateText({
            model: resolveModel({
              provider: cfg.provider,
              modelId: TITLE_MODEL,
              gatewayUrl: gateway.url,
            }),
            prompt: `Generate a short, 3-6 word title for a chat that starts with this message. Reply with only the title, no quotes.\n\n${userText}`,
          });
          tokens += gen.usage?.totalTokens ?? 0;
          const t = gen.text.trim().replace(/^["']|["']$/g, "");
          if (t) title = t.slice(0, 60);
        } catch {
          // keep the slice fallback
        }
        set = { title };
      }
      const credits = creditsFor(tokens, cfg.creditMultiplier, cfg.minCredits);
      user.creditsUsed += credits;
      await user.save();
      if (conversationId) {
        // Source of truth is the client's message list (regenerate drops the old
        // answer before re-requesting), so overwrite instead of appending —
        // otherwise regenerate leaves the stale assistant message behind.
        const history = messages.map((m) => {
          const md = (m.metadata ?? {}) as {
            model?: string;
            tokens?: number;
            credits?: number;
            durationMs?: number;
          };
          return {
            role: m.role,
            content: textOf(m),
            tokenCount: md.tokens ?? 0,
            ...(m.role === "assistant" && md.model
              ? { model: md.model, credits: md.credits, durationMs: md.durationMs }
              : {}),
          };
        });
        // Preserve regenerate branches (stored client-side via setVariants) that
        // this overwrite would otherwise drop — carry them over by index.
        const existing = (await ConversationModel.findById(conversationId)
          .select("messages.variants")
          .lean()) as { messages?: { variants?: unknown[] }[] } | null;
        history.forEach((h, i) => {
          const v = existing?.messages?.[i]?.variants;
          if (h.role === "assistant" && v?.length) {
            (h as { variants?: unknown[] }).variants = v;
          }
        });
        history.push({
          role: "assistant",
          content: text,
          tokenCount: tokens,
          model: cfg.displayName,
          credits,
          durationMs: Date.now() - startedAt,
        });
        await ConversationModel.findByIdAndUpdate(conversationId, {
          $set: { ...set, messages: history },
        });
      }
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        const tokens = part.totalUsage?.totalTokens ?? 0;
        return {
          model: cfg.displayName, // hardcoded human name from admin config, not the id
          tokens,
          // ponytail: live value is generation-only; onFinish folds in title-gen
          // tokens and persists the authoritative credits, so post-refresh is exact.
          credits: creditsFor(tokens, cfg.creditMultiplier, cfg.minCredits),
          durationMs: Date.now() - startedAt,
        };
      }
    },
  });
});

app.get("/ping", (c) => c.json({ pong: true }));

export const GET = handle(app);
export const POST = handle(app);
