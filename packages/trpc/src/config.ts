// Central app/model configuration. Change defaults here — never hardcode model
// ids or names inline. Shared by the API (title generation) and the web client
// (chat model picker fallback).
export const config = {
  // model used to auto-generate conversation titles (best-effort)
  titleModel: "gpt-4o-mini",
  // selected in the chat picker when a conversation has no model stored yet
  defaultModelId: "gpt-4o-mini",
  // shown in the picker only when no models are enabled in the admin panel
  fallbackModel: { id: "gpt-4o-mini", name: "GPT-4o-mini", provider: "openai" },
} as const;

// Gateways are configured here, not in the DB. Each gateway's API key comes from
// the named env var. Add a row + its env key to wire up another gateway.
// OpenAI-compatible gateways (no `provider`/`models`) are listed live from
// {url}/models. Direct provider gateways set a fixed `provider` + seed `models`
// since their native APIs aren't Bearer/OpenAI-compatible for listing.
export type Gateway = {
  id: string;
  name: string;
  url: string;
  apiKeyEnv: string;
  provider?: string;
  models?: readonly string[];
  // OpenAI-compatible aggregator: resolve every listed model via the openai adapter
  forceProvider?: string;
};

export const gateways: readonly Gateway[] = [
  {
    id: "openai",
    name: "OpenAI Direct",
    url: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
  },
  {
    // OpenAI-compatible; model ids are "creator/model" e.g. "openai/gpt-4o", "anthropic/claude-..."
    id: "vercel",
    name: "Vercel AI Gateway",
    url: "https://ai-gateway.vercel.sh/v1",
    apiKeyEnv: "AI_GATEWAY_API_KEY",
    forceProvider: "openai",
  },
  {
    id: "google",
    name: "Google Gemini Direct",
    url: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyEnv: "GOOGLE_GENERATIVE_AI_API_KEY",
    provider: "google",
    // ponytail: seed list; bump when Google ships new Gemini ids
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude Direct",
    url: "https://api.anthropic.com/v1",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    provider: "anthropic",
    models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  },
  {
    // Vertex auth is GCP ADC, not an API key: set GOOGLE_VERTEX_PROJECT +
    // GOOGLE_VERTEX_LOCATION and GOOGLE_APPLICATION_CREDENTIALS. url unused (the
    // SDK builds the region endpoint). apiKeyEnv points at PROJECT so the admin
    // "hasKey" badge reflects whether it's configured.
    id: "vertex",
    name: "Google Vertex AI",
    url: "",
    apiKeyEnv: "GOOGLE_VERTEX_PROJECT",
    provider: "vertex",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"],
  },
];

export function getGateway(id: string): Gateway | undefined {
  return gateways.find((g) => g.id === id);
}

// the gateway's bearer token, read from its env var at call time
export function gatewayKey(g: Gateway): string | undefined {
  return process.env[g.apiKeyEnv];
}
