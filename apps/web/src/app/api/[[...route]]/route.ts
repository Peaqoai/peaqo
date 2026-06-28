import { Hono } from "hono";
import { handle } from "hono/vercel";
import { trpcServer } from "@hono/trpc-server";
import { appRouter, createTRPCContext } from "@repo/trpc";

const app = new Hono().basePath("/api");

app.use("/trpc/*", trpcServer({
  router: appRouter,
  createContext: (_opts, c) => createTRPCContext({ req: c.req.raw }),
}));

app.get("/ping", (c) => c.json({ pong: true }));

export const GET = handle(app);
export const POST = handle(app);
