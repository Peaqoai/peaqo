import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import {
  connectDB,
  ConversationModel,
  GatewayModel,
  ModelCfg,
  UserModel,
  Provider,
} from "@repo/db";
import { listGatewayModels, gatewayKeyAvailable } from "../llm/list-models";

// platform-wide counts for the admin dashboard
const stats = adminProcedure.query(async () => {
  await connectDB();
  const [users, chats] = await Promise.all([
    UserModel.countDocuments(),
    ConversationModel.countDocuments(),
  ]);
  return { users, chats };
});

const pageInput = z.object({
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().trim().default(""),
});

const users = router({
  // server-side paginated + filtered user list for the admin table
  list: adminProcedure
    .input(
      pageInput.extend({
        plan: z.enum(["free", "pro", "ultimate", "team"]).optional(),
        role: z.enum(["user", "admin"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      await connectDB();
      const filter: Record<string, unknown> = {};
      if (input.search) {
        const rx = { $regex: input.search, $options: "i" };
        filter.$or = [{ name: rx }, { email: rx }];
      }
      if (input.plan) filter.plan = input.plan;
      if (input.role) filter.role = input.role;

      const [rows, total] = await Promise.all([
        UserModel.find(filter)
          .select("name email avatarUrl plan role creditsUsed creditsLimit createdAt")
          .sort({ createdAt: -1 })
          .skip(input.page * input.pageSize)
          .limit(input.pageSize)
          .lean(),
        UserModel.countDocuments(filter),
      ]);
      return { rows: JSON.parse(JSON.stringify(rows)), total };
    }),

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

const modelInput = z.object({
  provider: Provider,
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  inputPrice: z.number().min(0).default(0),
  outputPrice: z.number().min(0).default(0),
  reasoning: z.boolean().default(false),
  systemPrompt: z.string().optional(),
  gatewayId: z.string().optional(),
  creditMultiplier: z.number().positive().default(1),
});

const models = router({
  create: adminProcedure.input(modelInput).mutation(async ({ input }) => {
    await connectDB();
    const m = await ModelCfg.create({ ...input, enabled: true });
    return { id: m.id as string };
  }),
  update: adminProcedure
    .input(modelInput.partial().extend({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const { id, ...rest } = input;
      await ModelCfg.findByIdAndUpdate(id, rest);
      return { ok: true };
    }),
  remove: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      await ModelCfg.findByIdAndDelete(input.id);
      return { ok: true };
    }),
  setEnabled: adminProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      await connectDB();
      await ModelCfg.findByIdAndUpdate(input.id, { enabled: input.enabled });
      return { ok: true };
    }),
  // is the gateway list key configured in env? gates the import UI
  envStatus: adminProcedure.query(() => ({ gatewayKey: gatewayKeyAvailable() })),
  // list models from a gateway (env key); provider derived per model
  listFromGateway: adminProcedure
    .input(z.object({ gatewayId: z.string() }))
    .query(async ({ input }) => {
      await connectDB();
      const gw = await GatewayModel.findById(input.gatewayId).lean();
      if (!gw) throw new Error("Gateway not found");
      return listGatewayModels((gw as unknown as { url: string }).url);
    }),
  listConfigured: adminProcedure.query(async () => {
    await connectDB();
    return ModelCfg.find().lean();
  }),
  // server-side paginated + filtered model list for the admin table
  listPaginated: adminProcedure
    .input(
      pageInput.extend({
        provider: Provider.optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .query(async ({ input }) => {
      await connectDB();
      const filter: Record<string, unknown> = {};
      if (input.search) {
        const rx = { $regex: input.search, $options: "i" };
        filter.$or = [{ displayName: rx }, { modelId: rx }];
      }
      if (input.provider) filter.provider = input.provider;
      if (typeof input.enabled === "boolean") filter.enabled = input.enabled;

      const [rows, total] = await Promise.all([
        ModelCfg.find(filter)
          .sort({ createdAt: -1 })
          .skip(input.page * input.pageSize)
          .limit(input.pageSize)
          .lean(),
        ModelCfg.countDocuments(filter),
      ]);
      return { rows: JSON.parse(JSON.stringify(rows)), total };
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

export const adminRouter = router({ gateways, models, users, stats });
