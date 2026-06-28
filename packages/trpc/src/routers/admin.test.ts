import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectDB, resetConnectionCache, UserModel } from "@repo/db";
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

describe("admin.gateways", () => {
  it("non-admin is forbidden", async () => {
    const u = await UserModel.create({ email: "u@b.com", name: "U" });
    const caller = appRouter.createCaller({ userId: u.id });
    await expect(caller.admin.gateways.list()).rejects.toThrow();
  });

  it("admin can create + list a gateway", async () => {
    const caller = appRouter.createCaller({ userId: adminId });
    await caller.admin.gateways.create({ name: "cf", url: "https://gw.test" });
    const list = await caller.admin.gateways.list();
    expect(list.length).toBe(1);
  });
});
