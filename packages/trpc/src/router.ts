import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { onboardingRouter } from "./routers/onboarding";
import { userRouter } from "./routers/user";
import { modelsRouter } from "./routers/models";

export const appRouter = router({
  health: publicProcedure
    .input(z.object({ name: z.string() }).optional())
    .query(({ input }) => ({ ok: true, hello: input?.name ?? "world" })),
  onboarding: onboardingRouter,
  user: userRouter,
  models: modelsRouter,
});

export type AppRouter = typeof appRouter;
