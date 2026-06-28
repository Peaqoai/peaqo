import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { connectDB, ConversationModel, ModelCfg } from "@repo/db";

// ownership-scoped: every query/mutation filters by userId so users can't touch others' chats
export const conversationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    await connectDB();
    return ConversationModel.find({ userId: ctx.userId })
      .select("title modelId updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await connectDB();
      return ConversationModel.findOne({ _id: input.id, userId: ctx.userId }).lean();
    }),

  create: protectedProcedure
    .input(z.object({ modelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      const cfg = (await ModelCfg.findOne({ modelId: input.modelId }).lean()) as
        | { provider?: string }
        | null;
      const c = await ConversationModel.create({
        userId: ctx.userId,
        modelId: input.modelId,
        provider: cfg?.provider ?? "openai",
      });
      return { id: c.id as string };
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      await ConversationModel.updateOne(
        { _id: input.id, userId: ctx.userId },
        { title: input.title },
      );
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      await ConversationModel.deleteOne({ _id: input.id, userId: ctx.userId });
      return { ok: true };
    }),
});
