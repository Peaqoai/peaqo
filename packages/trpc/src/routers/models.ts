import { router, publicProcedure } from "../trpc";
import { connectDB, ModelCfg } from "@repo/db";

export const modelsRouter = router({
  // Public: the chat model picker reads enabled models from here
  listEnabled: publicProcedure.query(async () => {
    await connectDB();
    return ModelCfg.find({ enabled: true })
      .select("provider modelId displayName creditMultiplier")
      .lean();
  }),
});
