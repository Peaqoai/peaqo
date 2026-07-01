import { z } from "zod";
import mongoose from "mongoose";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { connectDB, ConversationModel, PersonaModel, CharacterModel } from "@peaqo/db";
import { getModel } from "../models";

// ownership-scoped: every query/mutation filters by userId so users can't touch others' chats
export const conversationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    await connectDB();
    return ConversationModel.find({ userId: ctx.userId })
      .select("title modelId characterId mode updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
  }),

  // paginated + searchable feed for the /chat-history page (useInfiniteQuery).
  // cursor is an offset; nextCursor is null when the last page is reached.
  listPaged: protectedProcedure
    .input(
      z.object({
        search: z.string().trim().default(""),
        cursor: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      await connectDB();
      const match: Record<string, unknown> = {
        userId: new mongoose.Types.ObjectId(ctx.userId),
      };
      if (input.search) match.title = { $regex: input.search, $options: "i" };
      const items = await ConversationModel.aggregate([
        { $match: match },
        { $sort: { updatedAt: -1 } },
        { $skip: input.cursor },
        { $limit: input.limit },
        {
          $project: {
            title: 1,
            modelId: 1,
            updatedAt: 1,
            messageCount: { $size: { $ifNull: ["$messages", []] } },
            preview: { $arrayElemAt: ["$messages.content", -1] },
          },
        },
      ]);
      const nextCursor =
        items.length === input.limit ? input.cursor + input.limit : null;
      return { items, nextCursor };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await connectDB();
      return ConversationModel.findOne({ _id: input.id, userId: ctx.userId }).lean();
    }),

  create: protectedProcedure
    .input(
      z.object({
        modelId: z.string().optional(),
        personaId: z.string().optional(),
        characterId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      const owned = { $or: [{ scope: "global" }, { ownerId: ctx.userId }] };
      let modelId = input.modelId;
      let title = "New chat";

      // avatar chat: adopt the character's preset model. The greeting is shown
      // and sent by the client (so it survives onFinish's history rebuild), not
      // seeded here.
      if (input.characterId) {
        const ch = await CharacterModel.findOne({ _id: input.characterId, ...owned }).lean<{
          defaultModelId?: string;
          name?: string;
        }>();
        if (ch) {
          modelId = ch.defaultModelId ?? modelId;
          if (ch.name) title = `Chat with ${ch.name}`;
        }
      } else if (input.personaId) {
        // persona just presets the model; the chat is otherwise normal
        const p = await PersonaModel.findOne({ _id: input.personaId, ...owned }).lean<{
          defaultModelId?: string;
        }>();
        if (p) modelId = p.defaultModelId ?? modelId;
      }

      modelId = modelId ?? "gpt-4o-mini";
      const c = await ConversationModel.create({
        userId: ctx.userId,
        modelId,
        provider: getModel(modelId)?.provider ?? "openai",
        personaId: input.personaId,
        characterId: input.characterId,
        title,
      });
      return { id: c.id as string };
    }),

  // Super AI (super-fiesta / multi-chat): append one broadcast turn, creating
  // the conversation on the first turn. Returns the conversation id so the
  // client can keep appending and reload the session later.
  saveSuperTurn: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        mode: z.enum(["super-fiesta", "multi-chat"]),
        models: z.array(z.object({ modelId: z.string(), enabled: z.boolean().default(true) })).min(1),
        title: z.string().max(120).optional(),
        turn: z.object({
          prompt: z.string(),
          answers: z.array(
            z.object({ modelId: z.string(), model: z.string(), text: z.string() }),
          ),
          consensus: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      if (input.id) {
        const r = await ConversationModel.updateOne(
          { _id: input.id, userId: ctx.userId },
          { $push: { turns: input.turn }, $set: { superModels: input.models } },
        );
        if (r.matchedCount === 0) throw new TRPCError({ code: "NOT_FOUND" });
        return { id: input.id };
      }
      const first = input.models[0]!.modelId;
      const c = await ConversationModel.create({
        userId: ctx.userId,
        mode: input.mode,
        modelId: first,
        provider: getModel(first)?.provider ?? "openai",
        title: (input.title || input.turn.prompt).slice(0, 120) || "Super AI",
        superModels: input.models,
        turns: [input.turn],
      });
      return { id: c.id as string };
    }),

  // patch the consensus onto the most recent Super AI turn (multi-chat generates
  // it on demand, after the turn was already saved)
  setSuperConsensus: protectedProcedure
    .input(z.object({ id: z.string(), consensus: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      const conv = await ConversationModel.findOne({
        _id: input.id,
        userId: ctx.userId,
      })
        .select("turns")
        .lean<{ turns?: unknown[] }>();
      const n = conv?.turns?.length ?? 0;
      if (n === 0) throw new TRPCError({ code: "NOT_FOUND" });
      await ConversationModel.updateOne(
        { _id: input.id, userId: ctx.userId },
        { $set: { [`turns.${n - 1}.consensus`]: input.consensus } },
      );
      return { ok: true };
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
