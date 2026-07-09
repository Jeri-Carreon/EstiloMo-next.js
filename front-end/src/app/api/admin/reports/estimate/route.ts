import { NextRequest, NextResponse } from "next/server";

import { ANALYSIS_MODEL } from "@/lib/openai";
import { calculateOpenAICost } from "@/lib/openaiPricing";
import {
  buildReportAnalysisPrompt,
  estimatePromptTokens,
  REPORT_ANALYSIS_MAX_OUTPUT_TOKENS,
} from "@/lib/reportPrompt";
import { buildAIReportAnalytics } from "@/lib/reportAnalytics";
import { getAdminUser } from "@/lib/supabase/getUser";

export const dynamic = "force-dynamic";

function parseDateRange(from?: string | null, to?: string | null) {
  if (!from || !to) {
    throw new Error("Missing date range");
  }

  const startDate = new Date(from);
  const endDate = new Date(to);
  endDate.setHours(23, 59, 59, 999);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate > endDate
  ) {
    throw new Error("Invalid date range");
  }

  return { startDate, endDate };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAdminUser();
    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const dateRange = req.nextUrl.searchParams.get("dateRange") ?? `${from} - ${to}`;
    const { startDate, endDate } = parseDateRange(from, to);

    const analytics = await buildAIReportAnalytics({
      startDate,
      endDate,
      dateRangeLabel: dateRange,
    });
    const prompt = buildReportAnalysisPrompt(analytics);
    const estimatedInputTokens = estimatePromptTokens(prompt);
    const estimatedOutputTokens = REPORT_ANALYSIS_MAX_OUTPUT_TOKENS;
    const estimate = calculateOpenAICost({
      model: ANALYSIS_MODEL,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
    });

    return NextResponse.json({
      model: ANALYSIS_MODEL,
      dateRange,
      estimatedInputTokens: estimate.inputTokens,
      estimatedOutputTokens: estimate.outputTokens,
      estimatedTotalTokens: estimate.totalTokens,
      estimatedInputCostUSD: estimate.inputCostUSD,
      estimatedOutputCostUSD: estimate.outputCostUSD,
      estimatedTotalCostUSD: estimate.totalCostUSD,
      exchangeRatePHP: estimate.exchangeRatePHP,
      estimatedTotalCostPHP: estimate.totalCostPHP,
      maxOutputTokens: REPORT_ANALYSIS_MAX_OUTPUT_TOKENS,
      isEstimate: true,
    });
  } catch (error) {
    console.error("AI report estimate error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("date range") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
