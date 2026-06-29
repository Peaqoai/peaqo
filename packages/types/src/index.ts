// Shared types across the monorepo.
export type Gateway = {
  id: string;
  url: string; // API base URL
  apiKeyEnv: string; // env var holding the key
};

export type ModelDef = {
  modelId: string; // id sent to the provider, e.g. "gpt-4o-mini"
  displayName: string; // shown in the picker
  provider: string; // adapter: openai | anthropic | google | vertex | groq | openrouter | cloudflare
  gatewayId: string; // which gateway to route through
  description?: string;
  inputPrice?: number; // USD per 1M input tokens (metadata)
  outputPrice?: number; // USD per 1M output tokens (metadata)
  reasoning?: boolean; // enables provider thinking/reasoning
  systemPrompt?: string; // prepended as a system message on every turn
  creditMultiplier?: number; // 1 credit ≈ 1000 tokens × this (default 1)
  minCredits?: number; // floor charged per turn (default 1)
  enabled?: boolean; // hide from the picker without deleting (default true)
};
