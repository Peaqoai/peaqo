import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { connectDB, GatewayModel, ModelCfg, UserModel, Provider } from "@repo/db";
import { listProviderModels } from "../llm/list-models";

const users = router({
  // manual credit reset for an account (auto reset is a 30-day rolling window)
  resetCredits: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      await UserModel.updateOne(
        { _id: input.userId },
        { creditsUsed: 0, creditsResetAt: new Date() },
      );
      return { ok: true };
    }),
});

const gateways = router({
  create: adminProcedure
    .input(z.object({ name: z.string().min(1), url: z.string().url() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const g = await GatewayModel.create(input);
      return { id: g.id };
    }),
  list: adminProcedure.query(async () => {
    await connectDB();
    return GatewayModel.find().lean();
  }),
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      await GatewayModel.findByIdAndDelete(input.id);
      return { ok: true };
    }),
});

const models = router({
  listFromProvider: adminProcedure
    .input(z.object({ provider: Provider, apiKey: z.string() }))
    .query(async ({ input }) => listProviderModels(input.provider, input.apiKey)),
  listConfigured: adminProcedure.query(async () => {
    await connectDB();
    return ModelCfg.find().lean();
  }),
  toggleModel: adminProcedure
    .input(
      z.object({
        provider: Provider,
        gatewayId: z.string(),
        modelId: z.string(),
        displayName: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      await connectDB();
      await ModelCfg.findOneAndUpdate({ modelId: input.modelId }, input, {
        upsert: true,
      });
      return { ok: true };
    }),
  setMultiplier: adminProcedure
    .input(
      z.object({ modelId: z.string(), creditMultiplier: z.number().positive() }),
    )
    .mutation(async ({ input }) => {
      await connectDB();
      await ModelCfg.findOneAndUpdate(
        { modelId: input.modelId },
        { creditMultiplier: input.creditMultiplier },
      );
      return { ok: true };
    }),
});

export const adminRouter = router({ gateways, models, users });
