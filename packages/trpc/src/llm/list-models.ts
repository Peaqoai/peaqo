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
    data?: { id?: string }[];
    models?: { name?: string }[];
  };
  const items = json.data ?? json.models ?? [];
  return items
    .map((m) => ({ modelId: ("id" in m ? m.id : m.name) ?? "" }))
    .filter((m) => m.modelId);
}
