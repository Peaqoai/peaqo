import { Hono } from "hono";
import { handle } from "hono/vercel";
import { trpcServer } from "@hono/trpc-server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { appRouter, createTRPCContext } from "@repo/trpc";
import { resolveModel, canAfford, nextCreditsUsed } from "@repo/trpc/llm/resolve";
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
  const { modelId, messages, conversationId } = (await c.req.json()) as {
    modelId: string;
    messages: UIMessage[];
    conversationId?: string;
  };

  const user = await UserModel.findById(session.userId);
  if (!user || !canAfford(user)) return c.json({ error: "Out of credits" }, 402);

  const cfg = await ModelCfg.findOne({ modelId, enabled: true });
  if (!cfg) return c.json({ error: "Model not available" }, 400);
  const gateway = await GatewayModel.findById(cfg.gatewayId);
  if (!gateway) return c.json({ error: "Gateway not configured" }, 400);

  const model = resolveModel({
    provider: cfg.provider,
    modelId,
    gatewayUrl: gateway.url,
  });

  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model,
    messages: modelMessages,
    onFinish: async ({ usage }) => {
      const tokens = usage.totalTokens ?? 0;
      user.creditsUsed = nextCreditsUsed(user.creditsUsed, tokens, cfg.creditMultiplier);
      await user.save();
      if (conversationId) {
        const last = messages[messages.length - 1];
        const text = last?.parts
          ?.map((p) => ("text" in p ? p.text : ""))
          .join("") ?? "";
        await ConversationModel.findByIdAndUpdate(conversationId, {
          $push: { messages: { role: "user", content: text, tokenCount: tokens } },
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
});

app.get("/ping", (c) => c.json({ pong: true }));

export const GET = handle(app);
export const POST = handle(app);
