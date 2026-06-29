import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectDB, resetConnectionCache, UserModel } from "@peaqo/db";
import { appRouter } from "../router";

let mongod: MongoMemoryServer;
let adminId: string;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  resetConnectionCache();
  await connectDB(mongod.getUri());
  const a = await UserModel.create({
    email: "admin@b.com",
    name: "Ad",
    role: "admin",
  });
  adminId = a.id;
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("admin.stats", () => {
  it("non-admin is forbidden", async () => {
    const u = await UserModel.create({ email: "u@b.com", name: "U" });
    const caller = appRouter.createCaller({ userId: u.id });
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("admin gets platform counts", async () => {
    const caller = appRouter.createCaller({ userId: adminId });
    const stats = await caller.admin.stats();
    expect(stats).toHaveProperty("users");
    expect(stats).toHaveProperty("chats");
  });
});
