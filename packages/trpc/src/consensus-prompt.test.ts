import { describe, it, expect } from "vitest";
import { buildConsensusPrompt, CONSENSUS_SYSTEM } from "./consensus-prompt";

describe("buildConsensusPrompt", () => {
  it("includes the user prompt and every answer's text", () => {
    const out = buildConsensusPrompt("What is 2+2?", [
      { model: "GPT-4o", text: "It is 4." },
      { model: "Gemini", text: "The answer is four." },
    ]);
    expect(out).toContain("What is 2+2?");
    expect(out).toContain("It is 4.");
    expect(out).toContain("The answer is four.");
    expect(out).toContain("GPT-4o");
    expect(out).toContain("Gemini");
  });

  it("rejects fewer than 2 answers", () => {
    expect(() => buildConsensusPrompt("hi", [{ model: "GPT-4o", text: "hello" }])).toThrow(
      /at least 2/,
    );
  });

  it("exposes a synthesis system prompt", () => {
    expect(CONSENSUS_SYSTEM).toContain("synthesis");
  });
});
