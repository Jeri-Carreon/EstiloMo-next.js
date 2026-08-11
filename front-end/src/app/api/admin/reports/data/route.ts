import { NextRequest, NextResponse } from "next/server";

import {
  buildBusinessReportAnalytics,
  isReportType,
  type ReportType,
} from "@/lib/reportAnalytics";
import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";

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
    const auth = await requireAdminTabAccess("reports", req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const reportTypeParam = req.nextUrl.searchParams.get("reportType") ?? "summary";
    if (!isReportType(reportTypeParam)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
    const reportType: ReportType = reportTypeParam;
    const dateRange = req.nextUrl.searchParams.get("dateRange") ?? `${from} - ${to}`;
    const { startDate, endDate } = parseDateRange(from, to);
    const report = await buildBusinessReportAnalytics({
      startDate,
      endDate,
      dateRangeLabel: dateRange,
      reportType,
    });

    return NextResponse.json({
      ...report,
      ...report.legacySummary,
    });
  } catch (error) {
    console.error("Admin report data error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.toLowerCase().includes("date range") || message.toLowerCase().includes("report type") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
