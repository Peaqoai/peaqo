import { z } from "zod";

export const Provider = z.enum([
  "openai",
  "anthropic",
  "google",
  "groq",
  "openrouter",
  "cloudflare",
]);
export const Plan = z.enum(["free", "pro", "ultimate", "team"]);
export const Role = z.enum(["user", "admin"]);

export const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  plan: Plan.default("free"),
  role: Role.default("user"),
  orgId: z.string().optional(),
  onboardingComplete: z.boolean().default(false),
  creditsUsed: z.number().min(0).default(0),
  creditsLimit: z.number().min(0).default(10),
});

export const OrgSchema = z.object({
  name: z.string().min(1),
  ownerId: z.string(),
  members: z.array(z.string()).default([]),
});

export const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  tokenCount: z.number().min(0).default(0),
});

export const ConversationSchema = z.object({
  userId: z.string(),
  title: z.string().default("New chat"),
  modelId: z.string(),
  provider: Provider,
  messages: z.array(MessageSchema).default([]),
});

export const GatewaySchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
});

export const ModelSchema = z.object({
  provider: Provider,
  gatewayId: z.string(),
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  creditMultiplier: z.number().positive().default(1),
  enabled: z.boolean().default(true),
});
