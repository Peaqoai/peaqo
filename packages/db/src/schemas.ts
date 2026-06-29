import { z } from "zod";

export const Provider = z.enum([
  "openai",
  "anthropic",
  "google",
  "vertex",
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
  // assistant-only display metadata (persisted so the toolbar survives refresh)
  model: z.string().optional(),
  credits: z.number().min(0).optional(),
  durationMs: z.number().min(0).optional(),
  feedback: z.enum(["up", "down"]).optional(),
  // regenerate history; content+meta of every variant. The top-level fields
  // above mirror the currently-shown one.
  variants: z
    .array(
      z.object({
        content: z.string(),
        model: z.string().optional(),
        credits: z.number().min(0).optional(),
        durationMs: z.number().min(0).optional(),
      }),
    )
    .optional(),
});

export const Scope = z.enum(["global", "private"]);

// shared fields between a Persona (reply-style preset) and a Character (avatar)
const characterFields = {
  name: z.string().min(1).max(60),
  emoji: z.string().max(8).optional(),
  tagline: z.string().max(120).optional(),
  tone: z.string().max(300).optional(),
  traits: z.array(z.string().max(40)).max(8).default([]),
  description: z.string().max(8000).optional(),
  defaultModelId: z.string().min(1),
  hue: z.number().min(0).max(360).default(250),
  scope: Scope.default("private"),
};

export const PersonaSchema = z.object(characterFields);
export const CharacterSchema = z.object({
  ...characterFields,
  avatarUrl: z.string().startsWith("data:image/").max(700_000).optional(),
  greeting: z.string().max(1000).optional(),
});

export const ConversationSchema = z.object({
  userId: z.string(),
  title: z.string().default("New chat"),
  modelId: z.string(),
  provider: Provider,
  messages: z.array(MessageSchema).default([]),
});
