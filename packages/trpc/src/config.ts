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
export const gateways = [
  {
    id: "openai",
    name: "OpenAI Direct",
    url: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
  },
] as const;

export type Gateway = (typeof gateways)[number];

export function getGateway(id: string): Gateway | undefined {
  return gateways.find((g) => g.id === id);
}

// the gateway's bearer token, read from its env var at call time
export function gatewayKey(g: Gateway): string | undefined {
  return process.env[g.apiKeyEnv];
}
