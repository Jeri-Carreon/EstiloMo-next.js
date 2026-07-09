import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { isChatbotOpenAIModel, type ChatbotOpenAIModel } from "@/lib/openaiPricing";
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

function getCreatedAtRange(req: NextRequest) {
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

export async function GET(req: NextRequest) {
  try {
    const user = await getAdminUser();
    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const createdAt = getCreatedAtRange(req);
    const modelParam = req.nextUrl.searchParams.get("model");
    const model = isChatbotOpenAIModel(modelParam) ? modelParam : null;
    const where = {
      createdAt,
      ...(model ? { model } : {}),
    };

    const [aggregate, modelGroups] = await Promise.all([
      db.aIChatbotLog.aggregate({
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
      db.aIChatbotLog.groupBy({
        by: ["model"],
        where,
        _count: { id: true },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          totalCostUSD: true,
          totalCostPHP: true,
        },
        orderBy: { model: "asc" },
      }),
    ]);

    const totalMessages = aggregate._count.id;
    const totalCostUSD = decimalToNumber(aggregate._sum.totalCostUSD);
    const totalCostPHP = decimalToNumber(aggregate._sum.totalCostPHP);

    return NextResponse.json({
      filter: {
        from: createdAt.gte.toISOString(),
        to: createdAt.lte.toISOString(),
        model: model ?? "all",
      },
      totalChatbotMessages: totalMessages,
      totalInputTokens: aggregate._sum.inputTokens ?? 0,
      totalOutputTokens: aggregate._sum.outputTokens ?? 0,
      totalTokens: aggregate._sum.totalTokens ?? 0,
      averageTokensPerMessage: Math.round(aggregate._avg.totalTokens ?? 0),
      totalCostUSD,
      totalCostPHP,
      averageCostPerMessageUSD: totalMessages ? totalCostUSD / totalMessages : 0,
      averageCostPerMessagePHP: totalMessages ? totalCostPHP / totalMessages : 0,
      usageByModel: modelGroups.map((group) => {
        const messageCount = group._count.id;
        const groupCostUSD = decimalToNumber(group._sum.totalCostUSD);
        const groupCostPHP = decimalToNumber(group._sum.totalCostPHP);

        return {
          model: group.model as ChatbotOpenAIModel,
          totalChatbotMessages: messageCount,
          totalInputTokens: group._sum.inputTokens ?? 0,
          totalOutputTokens: group._sum.outputTokens ?? 0,
          totalTokens: group._sum.totalTokens ?? 0,
          totalCostUSD: groupCostUSD,
          totalCostPHP: groupCostPHP,
          averageCostPerMessageUSD: messageCount ? groupCostUSD / messageCount : 0,
          averageCostPerMessagePHP: messageCount ? groupCostPHP / messageCount : 0,
        };
      }),
    });
  } catch (error) {
    console.error("AI usage route error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("date range") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
