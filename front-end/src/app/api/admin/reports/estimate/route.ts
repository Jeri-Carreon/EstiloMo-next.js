import { NextRequest, NextResponse } from "next/server";

import { buildAIReportAnalytics } from "@/lib/reportAnalytics";
import { getAdminUser } from "@/lib/supabase/getUser";
import { hasAnyRole } from "@/lib/adminTabs";
import { getReportServiceClientConfig } from "@/server/reports-api/config";
import type { ReportEstimateSuccessResponse } from "@/server/reports-api/types/reports";

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

async function requestExternalReportEstimate({
  analytics,
  reportType,
}: {
  analytics: Awaited<ReturnType<typeof buildAIReportAnalytics>>;
  reportType: string;
}) {
  const { estimateUrl, apiKey } = getReportServiceClientConfig();

  const response = await fetch(estimateUrl, {
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
    console.error("AI report estimate service request failed:", {
      status: response.status,
      statusText: response.statusText,
      error: data?.error,
    });

    throw new Error(
      data?.error?.message ||
        data?.error ||
        "AI report estimate service request failed.",
    );
  }

  return data as ReportEstimateSuccessResponse;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAdminUser();
    if (!hasAnyRole(user, ["OWNER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const dateRange = req.nextUrl.searchParams.get("dateRange") ?? `${from} - ${to}`;
    const reportType = req.nextUrl.searchParams.get("reportType") ?? "summary";
    const { startDate, endDate } = parseDateRange(from, to);

    const analytics = await buildAIReportAnalytics({
      startDate,
      endDate,
      dateRangeLabel: dateRange,
    });
    const estimate = await requestExternalReportEstimate({
      analytics,
      reportType,
    });

    return NextResponse.json({
      model: estimate.model,
      dateRange,
      estimatedInputTokens: estimate.estimatedInputTokens,
      estimatedOutputTokens: estimate.estimatedOutputTokens,
      estimatedTotalTokens: estimate.estimatedTotalTokens,
      estimatedInputCostUSD: estimate.estimatedInputCostUSD,
      estimatedOutputCostUSD: estimate.estimatedOutputCostUSD,
      estimatedTotalCostUSD: estimate.estimatedTotalCostUSD,
      exchangeRatePHP: estimate.exchangeRatePHP,
      estimatedTotalCostPHP: estimate.estimatedTotalCostPHP,
      maxOutputTokens: estimate.maxOutputTokens,
      isEstimate: true,
    });
  } catch (error) {
    console.error("AI report estimate error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("date range") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
