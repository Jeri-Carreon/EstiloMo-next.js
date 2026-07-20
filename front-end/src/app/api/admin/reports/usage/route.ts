import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { isChatbotOpenAIModel, type ChatbotOpenAIModel } from "@/lib/openaiPricing";
import { getAdminUser } from "@/lib/supabase/getUser";
import { hasAnyRole } from "@/lib/adminTabs";

export const dynamic = "force-dynamic";

type UsageFilter = "today" | "week" | "month" | "custom";
type ModelWhere = {
  OR?: Array<{ model: string } | { model: { startsWith: string } }>;
};
type UsageTotals = {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUSD: number;
  totalCostPHP: number;
};
type UsageGroup = UsageTotals & {
  model: string;
};

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

function emptyTotals(): UsageTotals {
  return {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCostUSD: 0,
    totalCostPHP: 0,
  };
}

function getModelWhere(model: ChatbotOpenAIModel | null): ModelWhere {
  if (!model) return {};

  const versionPrefix = model === "gpt-4o" ? "gpt-4o-20" : `${model}-`;

  return {
    OR: [{ model }, { model: { startsWith: versionPrefix } }],
  };
}

function normalizeModel(model: string): string {
  if (model.startsWith("gpt-4o-mini")) return "gpt-4o-mini";
  if (model.startsWith("gpt-4o")) return "gpt-4o";
  return model;
}

function averageCost(totalCost: number, totalRequests: number): number {
  return totalRequests ? totalCost / totalRequests : 0;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAdminUser();
    if (!hasAnyRole(user, ["OWNER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const createdAt = getCreatedAtRange(req);
    const modelParam = req.nextUrl.searchParams.get("model");
    const model = isChatbotOpenAIModel(modelParam) ? modelParam : null;
    const modelWhere = getModelWhere(model);
    const chatbotWhere = {
      createdAt,
      ...modelWhere,
    };
    const reportWhere = {
      generatedAt: createdAt,
      ...modelWhere,
    };

    const [chatbotAggregate, chatbotModelGroups, reportAggregate, reportModelGroups] =
      await Promise.all([
        db.aIChatbotLog.aggregate({
          where: chatbotWhere,
          _count: { id: true },
          _sum: {
            inputTokens: true,
            outputTokens: true,
            totalTokens: true,
            totalCostUSD: true,
            totalCostPHP: true,
          },
        }),
        db.aIChatbotLog.groupBy({
          by: ["model"],
          where: chatbotWhere,
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
        db.aIReportLog.aggregate({
          where: reportWhere,
          _count: { id: true },
          _sum: {
            inputTokens: true,
            outputTokens: true,
            totalTokens: true,
            totalCostUSD: true,
            totalCostPHP: true,
          },
        }),
        db.aIReportLog.groupBy({
          by: ["model"],
          where: reportWhere,
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

    const chatbotTotals: UsageTotals = {
      totalRequests: chatbotAggregate._count.id,
      totalInputTokens: chatbotAggregate._sum.inputTokens ?? 0,
      totalOutputTokens: chatbotAggregate._sum.outputTokens ?? 0,
      totalTokens: chatbotAggregate._sum.totalTokens ?? 0,
      totalCostUSD: decimalToNumber(chatbotAggregate._sum.totalCostUSD),
      totalCostPHP: decimalToNumber(chatbotAggregate._sum.totalCostPHP),
    };
    const reportTotals: UsageTotals = {
      totalRequests: reportAggregate._count.id,
      totalInputTokens: reportAggregate._sum.inputTokens ?? 0,
      totalOutputTokens: reportAggregate._sum.outputTokens ?? 0,
      totalTokens: reportAggregate._sum.totalTokens ?? 0,
      totalCostUSD: decimalToNumber(reportAggregate._sum.totalCostUSD),
      totalCostPHP: decimalToNumber(reportAggregate._sum.totalCostPHP),
    };
    const totalRequests = chatbotTotals.totalRequests + reportTotals.totalRequests;
    const totalCostUSD = chatbotTotals.totalCostUSD + reportTotals.totalCostUSD;
    const totalCostPHP = chatbotTotals.totalCostPHP + reportTotals.totalCostPHP;
    const totalTokens = chatbotTotals.totalTokens + reportTotals.totalTokens;
    const usageByModel = new Map<string, UsageGroup>();

    for (const group of [...chatbotModelGroups, ...reportModelGroups]) {
      const modelName = normalizeModel(group.model);
      const current = usageByModel.get(modelName) ?? {
        model: modelName,
        ...emptyTotals(),
      };

      current.totalRequests += group._count.id;
      current.totalInputTokens += group._sum.inputTokens ?? 0;
      current.totalOutputTokens += group._sum.outputTokens ?? 0;
      current.totalTokens += group._sum.totalTokens ?? 0;
      current.totalCostUSD += decimalToNumber(group._sum.totalCostUSD);
      current.totalCostPHP += decimalToNumber(group._sum.totalCostPHP);
      usageByModel.set(modelName, current);
    }

    return NextResponse.json({
      filter: {
        from: createdAt.gte.toISOString(),
        to: createdAt.lte.toISOString(),
        model: model ?? "all",
      },
      totalRequests,
      totalChatbotMessages: chatbotTotals.totalRequests,
      totalReportGenerations: reportTotals.totalRequests,
      totalInputTokens: chatbotTotals.totalInputTokens + reportTotals.totalInputTokens,
      totalOutputTokens: chatbotTotals.totalOutputTokens + reportTotals.totalOutputTokens,
      totalTokens,
      averageTokensPerRequest: totalRequests ? Math.round(totalTokens / totalRequests) : 0,
      averageTokensPerMessage: chatbotTotals.totalRequests
        ? Math.round(chatbotTotals.totalTokens / chatbotTotals.totalRequests)
        : 0,
      totalCostUSD,
      totalCostPHP,
      averageCostPerRequestUSD: averageCost(totalCostUSD, totalRequests),
      averageCostPerRequestPHP: averageCost(totalCostPHP, totalRequests),
      averageCostPerMessageUSD: averageCost(
        chatbotTotals.totalCostUSD,
        chatbotTotals.totalRequests,
      ),
      averageCostPerMessagePHP: averageCost(
        chatbotTotals.totalCostPHP,
        chatbotTotals.totalRequests,
      ),
      usageBySource: [
        {
          source: "reports",
          label: "Report AI",
          ...reportTotals,
          averageCostPerRequestUSD: averageCost(
            reportTotals.totalCostUSD,
            reportTotals.totalRequests,
          ),
          averageCostPerRequestPHP: averageCost(
            reportTotals.totalCostPHP,
            reportTotals.totalRequests,
          ),
        },
        {
          source: "chatbot",
          label: "Chatbot Messages",
          ...chatbotTotals,
          averageCostPerRequestUSD: averageCost(
            chatbotTotals.totalCostUSD,
            chatbotTotals.totalRequests,
          ),
          averageCostPerRequestPHP: averageCost(
            chatbotTotals.totalCostPHP,
            chatbotTotals.totalRequests,
          ),
        },
      ],
      usageByModel: Array.from(usageByModel.values())
        .sort((a, b) => a.model.localeCompare(b.model))
        .map((group) => ({
          ...group,
          averageCostPerRequestUSD: averageCost(
            group.totalCostUSD,
            group.totalRequests,
          ),
          averageCostPerRequestPHP: averageCost(
            group.totalCostPHP,
            group.totalRequests,
          ),
        })),
    });
  } catch (error) {
    console.error("AI usage route error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("date range") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
