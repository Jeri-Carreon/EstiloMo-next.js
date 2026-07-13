import { NextRequest, NextResponse } from "next/server";

import { calculateOpenAICost } from "@/lib/openaiPricing";
import { ANALYSIS_MODEL } from "@/lib/openai";
import {
  buildReportAnalysisPrompt,
  REPORT_ANALYSIS_MAX_OUTPUT_TOKENS,
} from "@/lib/reportPrompt";
import {
  buildAIReportAnalytics,
  type AIReportAnalytics,
} from "@/lib/reportAnalytics";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

type ChatCompletionResponse = {
  model?: string;
  usage?: ChatUsage;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

function parseDateRange(from?: string, to?: string) {
  if (!from || !to) {
    throw new Error("Missing date range");
  }

  const startDate = new Date(from);
  const endDate = new Date(to);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    throw new Error("Invalid date range");
  }

  endDate.setHours(23, 59, 59, 999);

  if (startDate > endDate) {
    throw new Error("Invalid date range");
  }

  return { startDate, endDate };
}

function fallbackResponse(analytics?: AIReportAnalytics) {
  return {
    insights: [],
    revenueTrend:
      analytics?.comparisons.revenue.percentChange ?? 0,
    avgTrend:
      analytics?.comparisons.averageRevenuePerDay.percentChange ?? 0,
    apptTrend:
      analytics?.comparisons.appointments.percentChange ?? 0,
    rateTrend:
      analytics?.comparisons.completionRate.percentChange ?? 0,
    weeklyInsight: "",
    serviceRecommendation: "",
  };
}

function extractUsage(usage?: ChatUsage) {
  const inputTokens = Number(
    usage?.prompt_tokens ?? usage?.input_tokens ?? 0
  );

  const outputTokens = Number(
    usage?.completion_tokens ?? usage?.output_tokens ?? 0
  );

  const totalTokens = Number(
    usage?.total_tokens ?? inputTokens + outputTokens
  );

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  let analytics: AIReportAnalytics | undefined;

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      console.error(
        "OPENAI_API_KEY is missing from the Cloud Run runtime environment."
      );

      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as AnalyzeBody;

    const { startDate, endDate } = parseDateRange(
      body.from,
      body.to
    );

    const dateRange =
      body.dateRange ?? `${body.from} - ${body.to}`;

    const reportType = body.reportType ?? "summary";

    analytics = await buildAIReportAnalytics({
      startDate,
      endDate,
      dateRangeLabel: dateRange,
    });

    const model = ANALYSIS_MODEL;

    const res = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: REPORT_ANALYSIS_MAX_OUTPUT_TOKENS,
          temperature: 0.2,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "user",
              content: buildReportAnalysisPrompt(analytics),
            },
          ],
        }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errorText = await res.text();

      console.error("OpenAI request failed:", {
        status: res.status,
        statusText: res.statusText,
        response: errorText,
      });

      return NextResponse.json(
        {
          error: "OpenAI request failed",
        },
        { status: 500 }
      );
    }

    const data =
      (await res.json()) as ChatCompletionResponse;

    const responseModel = data.model ?? model;
    const usage = extractUsage(data.usage);

    try {
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
    } catch (usageLogError) {
      console.error("Failed to record AI report usage:", usageLogError);
    }

    const text =
      data.choices?.[0]?.message?.content ?? "{}";

    try {
      const clean = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(clean);

      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error(
        "Failed to parse OpenAI JSON response:",
        parseError
      );

      return NextResponse.json(
        fallbackResponse(analytics)
      );
    }
  } catch (error) {
    console.error("AI report analyze error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Internal server error";

    const status = message
      .toLowerCase()
      .includes("date range")
      ? 400
      : 500;

    if (status === 400) {
      return NextResponse.json(
        { error: message },
        { status }
      );
    }

    return NextResponse.json(
      {
        ...fallbackResponse(analytics),
        error: message,
      },
      { status }
    );
  }
}
