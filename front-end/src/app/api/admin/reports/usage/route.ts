import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";

export const dynamic = "force-dynamic";

type UsageFilter = "today" | "week" | "month" | "custom";

function parseDateOnly(value: string, endOfDay = false) {
  const date = new Date(value);
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek(now: Date) {
  const start = startOfToday(now);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getGeneratedAtRange(req: NextRequest) {
  const filter = (req.nextUrl.searchParams.get("filter") ?? "month") as UsageFilter;
  const now = new Date();

  if (filter === "today") {
    return { gte: startOfToday(now), lte: now };
  }

  if (filter === "week") {
    return { gte: startOfWeek(now), lte: now };
  }

  if (filter === "custom") {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    if (!from || !to) {
      throw new Error("Missing custom date range");
    }

    const startDate = parseDateOnly(from);
    const endDate = parseDateOnly(to, true);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate > endDate
    ) {
      throw new Error("Invalid custom date range");
    }

    return { gte: startDate, lte: endDate };
  }

  return { gte: startOfMonth(now), lte: now };
}

function decimalToNumber(value: unknown): number {
  return Number(value ?? 0);
}

function formatReport(log: {
  id: string;
  dateFrom: Date;
  dateTo: Date;
  reportType: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUSD: unknown;
  totalCostPHP: unknown;
  generatedAt: Date;
} | null) {
  if (!log) return null;

  return {
    id: log.id,
    dateFrom: log.dateFrom.toISOString(),
    dateTo: log.dateTo.toISOString(),
    reportType: log.reportType,
    model: log.model,
    inputTokens: log.inputTokens,
    outputTokens: log.outputTokens,
    totalTokens: log.totalTokens,
    totalCostUSD: decimalToNumber(log.totalCostUSD),
    totalCostPHP: decimalToNumber(log.totalCostPHP),
    generatedAt: log.generatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAdminUser();
    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const generatedAt = getGeneratedAtRange(req);
    const where = { generatedAt };

    const [aggregate, mostExpensive, cheapest] = await Promise.all([
      db.aIReportLog.aggregate({
        where,
        _count: { id: true },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          totalCostUSD: true,
          totalCostPHP: true,
        },
        _avg: {
          totalTokens: true,
          totalCostUSD: true,
          totalCostPHP: true,
        },
      }),
      db.aIReportLog.findFirst({
        where,
        orderBy: { totalCostUSD: "desc" },
      }),
      db.aIReportLog.findFirst({
        where,
        orderBy: { totalCostUSD: "asc" },
      }),
    ]);

    const totalReports = aggregate._count.id;
    const totalCostUSD = decimalToNumber(aggregate._sum.totalCostUSD);
    const totalCostPHP = decimalToNumber(aggregate._sum.totalCostPHP);

    return NextResponse.json({
      filter: {
        from: generatedAt.gte.toISOString(),
        to: generatedAt.lte.toISOString(),
      },
      totalReportsGenerated: totalReports,
      totalInputTokens: aggregate._sum.inputTokens ?? 0,
      totalOutputTokens: aggregate._sum.outputTokens ?? 0,
      totalTokens: aggregate._sum.totalTokens ?? 0,
      averageTokensPerReport: Math.round(aggregate._avg.totalTokens ?? 0),
      totalCostUSD,
      totalCostPHP,
      averageCostPerReportUSD: totalReports ? totalCostUSD / totalReports : 0,
      averageCostPerReportPHP: totalReports ? totalCostPHP / totalReports : 0,
      mostExpensiveReport: formatReport(mostExpensive),
      cheapestReport: formatReport(cheapest),
    });
  } catch (error) {
    console.error("AI usage route error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("date range") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
