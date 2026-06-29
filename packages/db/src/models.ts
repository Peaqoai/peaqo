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

const Conversation = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "New chat" },
    modelId: { type: String, required: true },
    provider: { type: String, required: true },
    messages: [Message],
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
