import { router, publicProcedure } from "../trpc";
import { enabledModels } from "../models";

export const modelsRouter = router({
  // Public: the chat model picker reads enabled models straight from config.ts
  listEnabled: publicProcedure.query(() =>
    enabledModels().map((m) => ({
      provider: m.provider,
      modelId: m.modelId,
      displayName: m.displayName,
      description: m.description,
      inputPrice: m.inputPrice,
      outputPrice: m.outputPrice,
      reasoning: m.reasoning ?? false,
      creditMultiplier: m.creditMultiplier ?? 1,
    })),
  ),
});
