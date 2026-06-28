// Fetches the live model list per provider. Anthropic has no list API -> seeded.
const ANTHROPIC_SEED = [
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
];

const ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/models",
  google: "https://generativelanguage.googleapis.com/v1beta/models",
  groq: "https://api.groq.com/openai/v1/models",
  openrouter: "https://openrouter.ai/api/v1/models",
};

// derive a known provider from an aggregator model id / metadata. `fallback` is
// the adapter to use when the id matches no known vendor — OpenAI-compatible
// gateways (Vercel) pass "openai"; true aggregators (OpenRouter) keep the default.
export function deriveProvider(id: string, ownedBy = "", fallback = "openrouter"): string {
  const hay = `${id} ${ownedBy}`.toLowerCase();
  if (hay.includes("anthropic") || hay.includes("claude")) return "anthropic";
  if (hay.includes("google") || hay.includes("gemini")) return "google";
  if (hay.includes("groq")) return "groq";
  if (hay.includes("cloudflare")) return "cloudflare";
  if (hay.includes("openai") || hay.includes("gpt") || hay.includes("o1") || hay.includes("o3"))
    return "openai";
  return fallback;
}

// List models straight from the gateway (OpenAI-compatible {url}/models) using
// that gateway's stored key (env GATEWAY_API_KEY as a fallback). provider is
// derived per model.
// `forceProvider` overrides per-model derivation: an OpenAI-compatible gateway
// (Vercel) serves every model over one OpenAI-style endpoint, so all its models
// resolve through the openai adapter regardless of the underlying vendor.
export async function listGatewayModels(
  gatewayUrl: string,
  apiKey?: string,
  forceProvider?: string,
): Promise<{ modelId: string; provider: string }[]> {
  const key = apiKey || process.env.GATEWAY_API_KEY;
  const base = gatewayUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}/models`, {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
  });
  if (!res.ok) throw new Error(`Gateway list failed: ${res.status}`);

  const json = (await res.json()) as {
    data?: { id?: string; name?: string; owned_by?: string }[];
    models?: { id?: string; name?: string; owned_by?: string }[];
  };
  const items = json.data ?? json.models ?? [];
  return items
    .map((m) => {
      const modelId = m.id ?? m.name ?? "";
      return { modelId, provider: forceProvider ?? deriveProvider(modelId, m.owned_by) };
    })
    .filter((m) => m.modelId);
}

export async function listProviderModels(
  provider: string,
  apiKey: string,
): Promise<{ modelId: string }[]> {
  if (provider === "anthropic") {
    return ANTHROPIC_SEED.map((modelId) => ({ modelId }));
  }
  const url = ENDPOINTS[provider];
  if (!url) throw new Error(`No model-list endpoint for provider: ${provider}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Provider list failed: ${res.status}`);

  const json = (await res.json()) as {
    data?: { id?: string; name?: string }[];
    models?: { id?: string; name?: string }[];
  };
  const items = json.data ?? json.models ?? [];
  return items
    .map((m) => ({ modelId: m.id ?? m.name ?? "" }))
    .filter((m) => m.modelId);
}
