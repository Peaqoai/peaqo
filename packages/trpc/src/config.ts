// App-level configuration. Models live in models.ts; types in types.ts.
export const config = {
  // model used to auto-generate conversation titles (must be a modelId in models.ts)
  titleModel: "gpt-4o-mini",
  // model that merges multi-model answers into one consensus reply (Super Fiesta)
  consensusModel: "gpt-4o",
  // selected in the chat picker when a conversation has no model stored yet
  defaultModelId: "gpt-4o-mini",
  // shown in the picker only if `models` is empty
  fallbackModel: { id: "gpt-4o-mini", name: "GPT-4o-mini", provider: "openai" },
} as const;
