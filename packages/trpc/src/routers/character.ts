import { z } from "zod";
import mongoose, { type Model } from "mongoose";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { connectDB, PersonaModel, CharacterModel } from "@repo/db";

// Persona and Character are distinct collections with the same CRUD shape, so
// the input shapes and routers are generated from a shared factory.
const baseShape = {
  name: z.string().min(1).max(60),
  emoji: z.string().max(8).optional(),
  tagline: z.string().max(120).optional(),
  tone: z.string().max(300).optional(),
  traits: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  description: z.string().max(8000).optional(),
  defaultModelId: z.string().min(1),
  hue: z.number().min(0).max(360).default(250),
};
export const personaShape = { ...baseShape };
export const characterShape = {
  ...baseShape,
  avatarUrl: z.string().startsWith("data:image/").max(700_000).optional(),
  greeting: z.string().max(1000).optional(),
};

const oid = (id: string) => new mongoose.Types.ObjectId(id);
const visibleTo = (userId: string) => ({ $or: [{ scope: "global" }, { ownerId: oid(userId) }] });
const clean = (v: unknown) => JSON.parse(JSON.stringify(v));

// user-facing router: list global + own, CRUD on own private docs only
function userRouter(Model: Model<any>, shape: z.ZodRawShape) {
  const input = z.object(shape);
  return router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await connectDB();
      return clean(
        await Model.find(visibleTo(ctx.userId)).sort({ scope: 1, createdAt: -1 }).lean(),
      );
    }),
    get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      await connectDB();
      const c = await Model.findOne({ _id: input.id, ...visibleTo(ctx.userId) }).lean();
      return c ? clean(c) : null;
    }),
    create: protectedProcedure.input(input).mutation(async ({ ctx, input }) => {
      await connectDB();
      const c = await Model.create({ ...input, scope: "private", ownerId: ctx.userId });
      return { id: c.id as string };
    }),
    update: protectedProcedure
      .input(input.partial().extend({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await connectDB();
        const { id, ...rest } = input;
        const r = await Model.updateOne(
          { _id: id, ownerId: oid(ctx.userId), scope: "private" },
          { $set: rest },
        );
        if (r.matchedCount === 0) throw new TRPCError({ code: "NOT_FOUND" });
        return { ok: true };
      }),
    remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await connectDB();
      await Model.deleteOne({ _id: input.id, ownerId: oid(ctx.userId), scope: "private" });
      return { ok: true };
    }),
  });
}

// admin router: global CRUD (everything written is scope:"global")
export function adminCharacterRouter(Model: Model<any>, shape: z.ZodRawShape) {
  const input = z.object(shape);
  return router({
    list: adminProcedure.query(async () => {
      await connectDB();
      return clean(await Model.find({ scope: "global" }).sort({ createdAt: -1 }).lean());
    }),
    create: adminProcedure.input(input).mutation(async ({ input }) => {
      await connectDB();
      const c = await Model.create({ ...input, scope: "global" });
      return { id: c.id as string };
    }),
    update: adminProcedure
      .input(input.partial().extend({ id: z.string() }))
      .mutation(async ({ input }) => {
        await connectDB();
        const { id, ...rest } = input;
        await Model.updateOne({ _id: id, scope: "global" }, { $set: rest });
        return { ok: true };
      }),
    remove: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await connectDB();
      await Model.deleteOne({ _id: input.id, scope: "global" });
      return { ok: true };
    }),
  });
}

export const personaRouter = userRouter(PersonaModel, personaShape);
export const characterRouter = userRouter(CharacterModel, characterShape);
