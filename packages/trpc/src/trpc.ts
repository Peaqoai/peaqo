import { initTRPC, TRPCError } from "@trpc/server";

export type Context = { userId: string | null };

export async function createTRPCContext(opts: { req: Request }): Promise<Context> {
  // ponytail: session wired in Phase 3; null for now
  void opts;
  return { userId: null };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { userId: ctx.userId } });
});
