import { NextRequest, NextResponse } from "next/server";

import { calculateOpenAICost } from "@/lib/openaiPricing";
import {
  buildAIReportAnalytics,
  type AIReportAnalytics,
} from "@/lib/reportAnalytics";
import { db } from "@/lib/db";
import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";
import { getReportServiceClientConfig } from "@/server/reports-api/config";
import type { ReportAnalyzeSuccessResponse } from "@/server/reports-api/types/reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AnalyzeBody = {
  from?: string;
  to?: string;
  dateRange?: string;
  reportType?: string;
};

function parseDateRange(from?: string, to?: string) {
  if (!from || !to) {
    throw new Error("Missing date range");
  }

  const startDate = new Date(from);
  const endDate = new Date(to);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
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
    revenueTrend: analytics?.comparisons.revenue.percentChange ?? 0,
    avgTrend: analytics?.comparisons.averageRevenuePerDay.percentChange ?? 0,
    apptTrend: analytics?.comparisons.appointments.percentChange ?? 0,
    rateTrend: analytics?.comparisons.completionRate.percentChange ?? 0,
    weeklyInsight: "",
    serviceRecommendation: "",
  };
}

async function requestExternalReportAnalysis({
  analytics,
  reportType,
}: {
  analytics: AIReportAnalytics;
  reportType: string;
}) {
  const { analyzeUrl, apiKey } = getReportServiceClientConfig();

  const response = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      reportType,
      dateRange: {
        from: analytics.reportPeriod.dateFrom,
        to: analytics.reportPeriod.dateTo,
      },
      analytics,
    }),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("AI report service request failed:", {
      status: response.status,
      statusText: response.statusText,
      error: data?.error,
    });

    throw new Error(
      data?.error?.message ||
        data?.error ||
        "AI report service request failed.",
    );
  }

  return data as ReportAnalyzeSuccessResponse;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminTabAccess("reports", req);

  if (auth.status !== 200) {
    return adminAuthorizationResponse(auth.status);
  }

  const user = auth.user;

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

    const serviceResponse = await requestExternalReportAnalysis({
      analytics,
      reportType,
    });

    try {
      const cost = calculateOpenAICost({
        model: serviceResponse.model,
        inputTokens: serviceResponse.usage.promptTokens,
        outputTokens: serviceResponse.usage.completionTokens,
        totalTokens: serviceResponse.usage.totalTokens,
      });

      await db.aIReportLog.create({
        data: {
          dateFrom: startDate,
          dateTo: endDate,
          reportType,
          model: serviceResponse.model,
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

    return NextResponse.json(serviceResponse.analysis);
  } catch (error) {
    console.error("AI report analyze error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.toLowerCase().includes("date range") ? 400 : 500;

    if (status === 400) {
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      {
        ...fallbackResponse(analytics),
        error: message,
      },
      { status },
    );
  }
}
