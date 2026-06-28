import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { onboardingRouter } from "./routers/onboarding";
import { userRouter } from "./routers/user";

export const appRouter = router({
  health: publicProcedure
    .input(z.object({ name: z.string() }).optional())
    .query(({ input }) => ({ ok: true, hello: input?.name ?? "world" })),
  onboarding: onboardingRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
