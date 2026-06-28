import { z } from "zod";
import { TRPCError } from "@trpc/server";
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

  // thumbs up/down on an assistant message, addressed by its array index.
  // value null clears the vote (toggle off).
  feedback: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        index: z.number().int().min(0),
        value: z.enum(["up", "down"]).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      await ConversationModel.updateOne(
        { _id: input.id, userId: ctx.userId },
        { $set: { [`messages.${input.index}.feedback`]: input.value ?? undefined } },
      );
      return { ok: true };
    }),

  // persist the regenerate history for an assistant message (by array index)
  setVariants: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        index: z.number().int().min(0),
        variants: z.array(
          z.object({
            content: z.string(),
            model: z.string().optional(),
            credits: z.number().optional(),
            durationMs: z.number().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      await ConversationModel.updateOne(
        { _id: input.id, userId: ctx.userId },
        { $set: { [`messages.${input.index}.variants`]: input.variants } },
      );
      return { ok: true };
    }),

  // fork the conversation up to (and including) one message into a brand-new chat.
  // copies persisted message subdocs as-is, so regenerate variants come along too.
  branch: protectedProcedure
    .input(z.object({ id: z.string(), upToIndex: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      const src = await ConversationModel.findOne({
        _id: input.id,
        userId: ctx.userId,
      }).lean<{
        title: string;
        modelId: string;
        provider: string;
        messages?: unknown[];
      }>();
      if (!src) throw new TRPCError({ code: "NOT_FOUND" });
      const messages = (src.messages ?? []).slice(0, input.upToIndex + 1);
      const c = await ConversationModel.create({
        userId: ctx.userId,
        title: src.title,
        modelId: src.modelId,
        provider: src.provider,
        messages,
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
