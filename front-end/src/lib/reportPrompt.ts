import type { AIReportAnalytics } from "@/lib/reportAnalytics";

export const REPORT_ANALYSIS_MAX_OUTPUT_TOKENS = 1000;

export function buildReportAnalysisPrompt(analytics: AIReportAnalytics) {
  return `You are a business analyst for a barbershop. Analyze the summarized analytics below and respond ONLY with a valid JSON object, no markdown, no backticks, no explanation.

Use the numbers in the analytics summary. Do not request or assume raw database rows.

Analytics summary:
${JSON.stringify(analytics)}

Return exactly this JSON structure:
{
  "insights": [
    { "icon": "emoji", "title": "string", "body": "string" },
    { "icon": "emoji", "title": "string", "body": "string" },
    { "icon": "emoji", "title": "string", "body": "string" }
  ],
  "revenueTrend": <number, positive or negative integer>,
  "avgTrend": <number>,
  "apptTrend": <number>,
  "rateTrend": <number>,
  "weeklyInsight": "<one sentence about the revenue/transaction trend>",
  "serviceRecommendation": "<one sentence recommending which service to focus on>"
}`;
}

export function estimatePromptTokens(prompt: string) {
  return Math.ceil(prompt.length / 4) + 16;
}
