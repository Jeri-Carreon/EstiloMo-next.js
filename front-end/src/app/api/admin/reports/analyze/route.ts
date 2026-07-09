import { NextRequest, NextResponse } from "next/server";

import { ANALYSIS_MODEL } from "@/lib/openai";
import { calculateOpenAICost } from "@/lib/openaiPricing";
import {
  buildReportAnalysisPrompt,
  REPORT_ANALYSIS_MAX_OUTPUT_TOKENS,
} from "@/lib/reportPrompt";
import { buildAIReportAnalytics, type AIReportAnalytics } from "@/lib/reportAnalytics";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";

export const dynamic = "force-dynamic";

type AnalyzeBody = {
  from?: string;
  to?: string;
  dateRange?: string;
  reportType?: string;
};

type ChatUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
};

function parseDateRange(from?: string, to?: string) {
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

function fallbackResponse(analytics?: AIReportAnalytics) {
  return {
    insights: [],
    revenueTrend: analytics?.comparisons.revenue.percentChange ?? 0,
    avgTrend: analytics?.comparisons.averageRevenuePerDay.percentChange ?? 0,
    apptTrend: analytics?.comparisons.appointments.percentChange ?? 0,
    rateTrend: analytics?.comparisons.completionRate.percentChange ?? 0,
    weeklyInsight: "",
    serviceRecommendation: "",
  };
}

function extractUsage(usage?: ChatUsage) {
  const inputTokens = Number(usage?.prompt_tokens ?? usage?.input_tokens ?? 0);
  const outputTokens = Number(usage?.completion_tokens ?? usage?.output_tokens ?? 0);
  const totalTokens = Number(usage?.total_tokens ?? inputTokens + outputTokens);

  return { inputTokens, outputTokens, totalTokens };
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser();
  if (!user || !["OWNER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let analytics: AIReportAnalytics | undefined;

  try {
    const body = (await req.json()) as AnalyzeBody;
    const { startDate, endDate } = parseDateRange(body.from, body.to);
    const dateRange = body.dateRange ?? `${body.from} - ${body.to}`;
    const reportType = body.reportType ?? "summary";

    analytics = await buildAIReportAnalytics({
      startDate,
      endDate,
      dateRangeLabel: dateRange,
    });

    const model = ANALYSIS_MODEL;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 500 });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: REPORT_ANALYSIS_MAX_OUTPUT_TOKENS,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: buildReportAnalysisPrompt(analytics) }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI error:", errText);
      return NextResponse.json({ error: "OpenAI request failed" }, { status: 500 });
    }

    const data = await res.json();
    const responseModel = data.model ?? model;
    const usage = extractUsage(data.usage);
    const cost = calculateOpenAICost({
      model: responseModel,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    });

    await db.aIReportLog.create({
      data: {
        dateFrom: startDate,
        dateTo: endDate,
        reportType,
        model: responseModel,
        inputTokens: cost.inputTokens,
        outputTokens: cost.outputTokens,
        totalTokens: cost.totalTokens,
        inputCostUSD: cost.inputCostUSD,
        outputCostUSD: cost.outputCostUSD,
        totalCostUSD: cost.totalCostUSD,
        exchangeRatePHP: cost.exchangeRatePHP,
        totalCostPHP: cost.totalCostPHP,
        generatedBy: user.id,
      },
    });

    const text = data.choices?.[0]?.message?.content ?? "{}";

    try {
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json(fallbackResponse(analytics));
    }
  } catch (error) {
    console.error("AI report analyze error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("date range") ? 400 : 500;

    if (status === 400) {
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(fallbackResponse(analytics), { status });
  }
}
