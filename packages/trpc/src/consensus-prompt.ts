// Builds the input for the consensus pass: one model reads every model's answer
// and writes a single merged reply. Pure + testable; the route wires it to streamText.
export type ModelAnswer = { model: string; text: string };

export const CONSENSUS_SYSTEM =
  "You are a synthesis assistant. Below are answers from several AI models to the " +
  "same question. Produce one best combined answer, resolving disagreements and " +
  "keeping the strongest points. Do not mention the individual models or that you " +
  "are merging answers — just give the final answer.";

export function buildConsensusPrompt(userPrompt: string, answers: ModelAnswer[]): string {
  if (answers.length < 2) throw new Error("consensus needs at least 2 answers");
  const blocks = answers
    .map((a, i) => `### Answer ${i + 1} (${a.model})\n${a.text}`)
    .join("\n\n");
  return `User question:\n${userPrompt}\n\nAnswers from different AI models:\n\n${blocks}`;
}
