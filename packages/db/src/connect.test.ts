import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectDB, resetConnectionCache } from "./connect";

let mongod: MongoMemoryServer;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("connectDB", () => {
  it("connects with a valid uri", async () => {
    resetConnectionCache();
    const m = await connectDB(mongod.getUri());
    expect(m.connection.readyState).toBe(1);
  });
  it("throws without a uri", () => {
    resetConnectionCache();
    expect(() => connectDB("")).toThrow("MONGODB_URI");
  });
});
