import { describe, it, expect } from "vitest";
import { buildPersonaSystem, buildCharacterSystem } from "./character-prompt";

describe("buildPersonaSystem", () => {
  it("stays an assistant in a named voice", () => {
    const s = buildPersonaSystem({
      name: "Reviewer",
      tagline: "strict code reviewer",
      traits: ["pedantic", "fast"],
    });
    expect(s).toContain('"Reviewer"');
    expect(s).toContain("pedantic, fast");
    expect(s).toContain("still a helpful assistant");
  });

  it("skips empty fields", () => {
    const s = buildPersonaSystem({ name: "X" });
    expect(s).not.toContain("Role:");
    expect(s).not.toContain("Tone");
  });
});

describe("buildCharacterSystem", () => {
  it("stays in character and hides being an AI", () => {
    const s = buildCharacterSystem({
      name: "Sherlock",
      description: "A consulting detective.",
    });
    expect(s).toContain("You are Sherlock");
    expect(s).toContain("Never say you are an AI");
    expect(s).not.toContain("helpful assistant");
  });
});
