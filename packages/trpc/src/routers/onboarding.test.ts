import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectDB, resetConnectionCache, UserModel } from "@peaqo/db";
import { appRouter } from "../router";

let mongod: MongoMemoryServer;
let userId: string;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  resetConnectionCache();
  await connectDB(mongod.getUri());
  const u = await UserModel.create({ email: "a@b.com", name: "A" });
  userId = u.id;
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("onboarding.selectPlan", () => {
  it("sets creditsLimit from the plan map", async () => {
    const caller = appRouter.createCaller({ userId });
    await caller.onboarding.selectPlan({ plan: "pro" });
    const u = await UserModel.findById(userId);
    expect(u!.plan).toBe("pro");
    expect(u!.creditsLimit).toBe(2000);
  });

  it("ultimate grants 6000 credits", async () => {
    const caller = appRouter.createCaller({ userId });
    await caller.onboarding.selectPlan({ plan: "ultimate" });
    const u = await UserModel.findById(userId);
    expect(u!.creditsLimit).toBe(6000);
  });
});

describe("auth guard", () => {
  it("rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller({ userId: null });
    await expect(caller.onboarding.selectPlan({ plan: "free" })).rejects.toThrow();
  });
});
