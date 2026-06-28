import mongoose from "mongoose";

let cached: Promise<typeof mongoose> | null = null;

export function connectDB(uri = process.env.MONGODB_URI): Promise<typeof mongoose> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!cached) cached = mongoose.connect(uri);
  return cached;
}

export function resetConnectionCache() {
  cached = null; // ponytail: test-only reset
}
