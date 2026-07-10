import OpenAI from "openai";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey,
  });
}

// For everyday questions: fast, cheap, more than capable
export const CHAT_MODEL = process.env.CHAT_MODEL ?? "gpt-4o-mini";

// For deep strategic analysis: slower, thorough, better reasoning
export const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL ?? "gpt-4o";