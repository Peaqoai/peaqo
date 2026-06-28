import { describe, it, expect } from "vitest";
import { creditsFor, canAfford, nextCreditsUsed } from "./resolve";

describe("creditsFor", () => {
  it("base multiplier rounds up", () => {
    expect(creditsFor(1500, 1)).toBe(2); // 1.5 -> 2
  });
  it("applies the model multiplier", () => {
    expect(creditsFor(1000, 3)).toBe(3);
  });
  it("zero tokens costs zero", () => {
    expect(creditsFor(0, 5)).toBe(0);
  });
});

describe("credit guard", () => {
  it("blocks when used >= limit", () => {
    expect(canAfford({ creditsUsed: 10, creditsLimit: 10 })).toBe(false);
  });
  it("allows when under limit", () => {
    expect(canAfford({ creditsUsed: 3, creditsLimit: 10 })).toBe(true);
  });
  it("adds deducted credits", () => {
    expect(nextCreditsUsed(3, 1000, 2)).toBe(5); // 3 + ceil(1*2)
  });
});
