import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectDB, resetConnectionCache } from "./connect";
import { UserModel } from "./models";
import { UserSchema } from "./schemas";

let mongod: MongoMemoryServer;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  resetConnectionCache();
  await connectDB(mongod.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("User model + schema", () => {
  it("zod rejects bad email", () => {
    expect(UserSchema.safeParse({ email: "nope", name: "A" }).success).toBe(false);
  });
  it("persists a valid user with defaults", async () => {
    const u = await UserModel.create({ email: "a@b.com", name: "A" });
    expect(u.plan).toBe("free");
    expect(u.creditsLimit).toBe(10);
    expect(u.role).toBe("user");
  });
});
