import { initTRPC, TRPCError } from "@trpc/server";
import { getSession } from "@repo/auth";
import { connectDB, UserModel } from "@repo/db";

export type Context = { userId: string | null };

export async function createTRPCContext(opts: { req: Request }): Promise<Context> {
  const s = await getSession(opts.req);
  return { userId: s?.userId ?? null };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { userId: ctx.userId } });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  await connectDB();
  const u = await UserModel.findById(ctx.userId).lean();
  if (!u || u.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});
