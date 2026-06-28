import { describe, it, expect } from "vitest";
import { shouldResetCredits } from "./resolve";

const DAY = 24 * 60 * 60 * 1000;

describe("shouldResetCredits", () => {
  it("resets when never set", () => {
    expect(shouldResetCredits(undefined)).toBe(true);
  });
  it("does not reset inside the 30-day window", () => {
    const now = new Date(2026, 0, 31);
    expect(shouldResetCredits(new Date(2026, 0, 10), now)).toBe(false);
  });
  it("resets once 30 days have passed", () => {
    const now = new Date(now0() + 31 * DAY);
    expect(shouldResetCredits(new Date(now0()), now)).toBe(true);
  });
});

function now0() {
  return new Date(2026, 0, 1).getTime();
}
