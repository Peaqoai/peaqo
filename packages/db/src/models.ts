import { Schema, model, models, type Model } from "mongoose";

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

const Gateway = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: true },
);

const ModelCfgSchema = new Schema(
  {
    provider: { type: String, required: true },
    gatewayId: { type: Schema.Types.ObjectId, ref: "Gateway", required: true },
    modelId: { type: String, required: true },
    displayName: { type: String, required: true },
    creditMultiplier: { type: Number, default: 1 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ponytail: cast to Model<any> — the `models.X ?? model()` union isn't callable otherwise
export const UserModel = (models.User ?? model("User", User)) as Model<any>;
export const OrgModel = (models.Organisation ??
  model("Organisation", Organisation)) as Model<any>;
export const ConversationModel = (models.Conversation ??
  model("Conversation", Conversation)) as Model<any>;
export const GatewayModel = (models.Gateway ??
  model("Gateway", Gateway)) as Model<any>;
export const ModelCfg = (models.Model ??
  model("Model", ModelCfgSchema)) as Model<any>;
