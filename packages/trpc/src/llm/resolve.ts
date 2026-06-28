import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// model used to auto-generate conversation titles
export const TITLE_MODEL = "gpt-4o-mini";

export function creditsFor(tokensUsed: number, multiplier: number): number {
  return Math.ceil((tokensUsed / 1000) * multiplier);
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
): number {
  return current + creditsFor(tokensUsed, multiplier);
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
