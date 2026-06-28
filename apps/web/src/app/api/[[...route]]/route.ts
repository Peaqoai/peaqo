import { Hono } from "hono";
import { handle } from "hono/vercel";
import { trpcServer } from "@hono/trpc-server";
import { streamText, generateText, convertToModelMessages, type UIMessage } from "ai";
import { appRouter, createTRPCContext } from "@repo/trpc";
import {
  resolveModel,
  webSearchTools,
  canAfford,
  nextCreditsUsed,
  shouldResetCredits,
  TITLE_MODEL,
} from "@repo/trpc/llm/resolve";
import { getAuth, getSession } from "@repo/auth";
import { connectDB, UserModel, ConversationModel, ModelCfg, GatewayModel } from "@repo/db";

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
  const gateway = await GatewayModel.findById(cfg.gatewayId);
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
  const result = streamText({
    model,
    messages: modelMessages,
    tools: webSearch ? webSearchTools(cfg.provider) : undefined,
    onFinish: async ({ text, usage }) => {
      const tokens = usage.totalTokens ?? 0;
      user.creditsUsed = nextCreditsUsed(user.creditsUsed, tokens, cfg.creditMultiplier);
      await user.save();
      if (conversationId) {
        // first turn -> generate a concise title with TITLE_MODEL (best-effort)
        let set: { title?: string } = {};
        if (messages.length <= 1) {
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
            const t = gen.text.trim().replace(/^["']|["']$/g, "");
            if (t) title = t.slice(0, 60);
          } catch {
            // keep the slice fallback
          }
          set = { title };
        }
        await ConversationModel.findByIdAndUpdate(conversationId, {
          ...(Object.keys(set).length ? { $set: set } : {}),
          $push: {
            messages: {
              $each: [
                { role: "user", content: userText, tokenCount: 0 },
                { role: "assistant", content: text, tokenCount: tokens },
              ],
            },
          },
        });
      }
    },
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true, sendSources: true });
});

app.get("/ping", (c) => c.json({ pong: true }));

export const GET = handle(app);
export const POST = handle(app);
