import { Schema, model, models, deleteModel, type Model } from "mongoose";

const User = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    avatarUrl: String,
    plan: { type: String, enum: ["free", "pro", "ultimate", "team"], default: "free" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    orgId: { type: Schema.Types.ObjectId, ref: "Organisation" },
    onboardingComplete: { type: Boolean, default: false },
    creditsUsed: { type: Number, default: 0 },
    creditsLimit: { type: Number, default: 10 },
    creditsResetAt: { type: Date, default: () => new Date() },
  },
  // ponytail: share better-auth's "user" collection so auth + app fields live on one doc
  { timestamps: true, collection: "user", strict: false },
);

const Organisation = new Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

const Message = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    tokenCount: { type: Number, default: 0 },
    model: { type: String },
    credits: { type: Number },
    durationMs: { type: Number },
    feedback: { type: String, enum: ["up", "down"] },
    variants: [
      {
        _id: false,
        content: { type: String },
        model: { type: String },
        credits: { type: Number },
        durationMs: { type: Number },
      },
    ],
  },
  { _id: false, timestamps: true },
);

// One broadcast turn in a Super AI session: a single prompt fanned out to many
// models, each answer stored, plus the optional merged consensus.
const SuperTurn = new Schema(
  {
    prompt: { type: String, required: true },
    answers: [
      { _id: false, modelId: { type: String }, model: { type: String }, text: { type: String } },
    ],
    consensus: { type: String },
  },
  { _id: false, timestamps: true },
);

const Conversation = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "New chat" },
    modelId: { type: String, required: true },
    provider: { type: String, required: true },
    // a normal chat styled by a Persona (reply-style preset)…
    personaId: { type: Schema.Types.ObjectId, ref: "Persona" },
    // …or an in-character chat with a Character (the avatar you talk to)
    characterId: { type: Schema.Types.ObjectId, ref: "Character" },
    messages: [Message],
    // Super AI sessions: mode marks the UI, superModels is the picked models /
    // column layout, and turns holds the resumable multi-model history.
    mode: { type: String, enum: ["chat", "super-fiesta", "multi-chat"], default: "chat" },
    superModels: [{ _id: false, modelId: { type: String }, enabled: { type: Boolean, default: true } }],
    turns: [SuperTurn],
  },
  { timestamps: true },
);

// Persona and Character are DISTINCT concepts but share most fields, so the
// common shape lives here. scope "global" = admin-made & everyone sees it;
// "private" = user-made & owner-only (ownerId set).
const characterFields = {
  name: { type: String, required: true },
  emoji: { type: String },
  tagline: { type: String },
  tone: { type: String },
  traits: [{ type: String }],
  description: { type: String },
  defaultModelId: { type: String, required: true },
  hue: { type: Number, default: 250 },
  scope: { type: String, enum: ["global", "private"], default: "private" },
  ownerId: { type: Schema.Types.ObjectId, ref: "User" },
};

// Persona — a reply-style preset applied on the normal /chat. description holds
// role + background knowledge.
const Persona = new Schema({ ...characterFields }, { timestamps: true });

// Character — an avatar you talk *to*, in-character. description holds
// personality + backstory; greeting is spoken first; avatarUrl is its picture.
const Character = new Schema(
  {
    ...characterFields,
    avatarUrl: { type: String }, // data-url
    greeting: { type: String },
  },
  { timestamps: true },
);

// ponytail: in dev, re-register on every module load so schema edits take effect
// without a manual server restart (Mongoose caches compiled models across HMR and
// silently drops fields the stale schema doesn't know). Cast to Model<any> — the
// `models.X ?? model()` union isn't callable otherwise.
const register = <S>(name: string, schema: S): Model<any> => {
  if (process.env.NODE_ENV !== "production" && models[name]) deleteModel(name);
  return (models[name] ?? model(name, schema as never)) as Model<any>;
};

export const UserModel = register("User", User);
export const OrgModel = register("Organisation", Organisation);
export const ConversationModel = register("Conversation", Conversation);
export const PersonaModel = register("Persona", Persona);
export const CharacterModel = register("Character", Character);
