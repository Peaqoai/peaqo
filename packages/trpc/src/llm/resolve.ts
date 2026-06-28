import { createOpenAI, openai } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { config } from "../config";

// model used to auto-generate conversation titles (see config.ts)
export const TITLE_MODEL = config.titleModel;

// 1 credit ≈ 1000 tokens × the model's multiplier, rounded up, but never below
// the model's minimum (both default to 1, configurable per model in admin).
export function creditsFor(
  tokensUsed: number,
  multiplier: number,
  minCredits = 1,
): number {
  return Math.max(minCredits, Math.ceil((tokensUsed / 1000) * multiplier));
}

export function canAfford(u: { creditsUsed: number; creditsLimit: number }): boolean {
  return u.creditsUsed < u.creditsLimit;
}

// ponytail: 30-day rolling reset; swap for a billing-period anchor if Stripe lands
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
export function shouldResetCredits(resetAt: Date | undefined, now = new Date()): boolean {
  if (!resetAt) return true;
  return now.getTime() - new Date(resetAt).getTime() >= PERIOD_MS;
}

export function nextCreditsUsed(
  current: number,
  tokensUsed: number,
  multiplier: number,
  minCredits = 1,
): number {
  return current + creditsFor(tokensUsed, multiplier, minCredits);
}

// ponytail: only OpenAI's hosted web search (Responses API) is wired; other
// providers no-op until their own search tool is added. Needs the gateway to
// proxy /responses for non-OpenAI-direct setups.
export function webSearchTools(provider: string) {
  if (provider === "openai" || provider === "cloudflare") {
    return { web_search: openai.tools.webSearchPreview({}) };
  }
  return undefined;
}

export function resolveModel(opts: {
  provider: string;
  modelId: string;
  gatewayUrl: string;
}) {
  const { provider, modelId, gatewayUrl } = opts;
  switch (provider) {
    case "openai":
      return createOpenAI({ baseURL: gatewayUrl })(modelId);
    case "anthropic":
      return createAnthropic({ baseURL: gatewayUrl })(modelId);
    case "google":
      return createGoogleGenerativeAI({ baseURL: gatewayUrl })(modelId);
    case "vertex":
      // Vertex auth/endpoint come from env (GOOGLE_VERTEX_PROJECT/LOCATION +
      // ADC); gatewayUrl is unused.
      return createVertex()(modelId);
    case "groq":
      return createGroq({ baseURL: gatewayUrl })(modelId);
    case "openrouter":
      return createOpenRouter({ baseURL: gatewayUrl })(modelId);
    case "cloudflare":
      // Cloudflare Workers AI is OpenAI-compatible
      return createOpenAI({ baseURL: gatewayUrl })(modelId);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
