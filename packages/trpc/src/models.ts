// THE ONLY PLACE MODELS LIVE. Add a model: append a row to `models`.
// Delete one: remove its row. Types are in types.ts, app config in config.ts.
import type { Gateway, ModelDef } from "@repo/types";

// Gateways map an id -> API base URL + the env var holding its key.
export const gateways: Gateway[] = [
  { id: "openai", url: "https://api.openai.com/v1", apiKeyEnv: "OPENAI_API_KEY" },
  { id: "anthropic", url: "https://api.anthropic.com/v1", apiKeyEnv: "ANTHROPIC_API_KEY" },
  { id: "google", url: "https://generativelanguage.googleapis.com/v1beta", apiKeyEnv: "GOOGLE_GENERATIVE_AI_API_KEY" },
];

export const models: ModelDef[] = [
  {
    modelId: "gpt-4o-mini",
    displayName: "GPT-4o-mini",
    provider: "openai",
    gatewayId: "openai",
    description: "Fast, cheap general-purpose model",
    inputPrice: 0.15,
    outputPrice: 0.6,
    creditMultiplier: 1,
    minCredits: 1,
  },
  {
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    gatewayId: "openai",
    inputPrice: 2.5,
    outputPrice: 10,
    creditMultiplier: 1,
  },
  {
    modelId: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    provider: "anthropic",
    gatewayId: "anthropic",
    inputPrice: 3,
    outputPrice: 15,
    reasoning: true,
  },
  {
    modelId: "claude-opus-4-8",
    displayName: "Claude Opus 4.8",
    provider: "anthropic",
    gatewayId: "anthropic",
    inputPrice: 15,
    outputPrice: 75,
    reasoning: true,
  },
  {
    modelId: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    provider: "google",
    gatewayId: "google",
    inputPrice: 1.25,
    outputPrice: 10,
    reasoning: true,
  },
  {
    modelId: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    provider: "google",
    gatewayId: "google",
    inputPrice: 0.3,
    outputPrice: 2.5,
  },
];

export function getGateway(id: string): Gateway | undefined {
  return gateways.find((g) => g.id === id);
}

export function getModel(modelId: string): ModelDef | undefined {
  return models.find((m) => m.modelId === modelId);
}

export function enabledModels(): ModelDef[] {
  return models.filter((m) => m.enabled !== false);
}
