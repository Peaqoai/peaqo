import { z } from "zod";
import { router, publicProcedure } from "./trpc";

export const appRouter = router({
  health: publicProcedure
    .input(z.object({ name: z.string() }).optional())
    .query(({ input }) => ({ ok: true, hello: input?.name ?? "world" })),
});

export type AppRouter = typeof appRouter;
