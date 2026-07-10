import { NextRequest, NextResponse } from "next/server";

import { calculateOpenAICost } from "@/lib/openaiPricing";
import { estimatePromptTokens } from "@/lib/reportPrompt";
import { getAdminUser } from "@/lib/supabase/getUser";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type DailyRevenuePoint = {
  date: string;
  revenue: number;
  transactions: number;
};

type ReportData = {
  dailyRevenue?: DailyRevenuePoint[];
} & Record<string, unknown>;

function roundNumber(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildDailyRevenueSummary(rows: DailyRevenuePoint[]) {
  const totalRevenue = rows.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
  const totalTransactions = rows.reduce(
    (sum, row) => sum + Number(row.transactions ?? 0),
    0,
  );
  const topRevenueDays = [...rows]
    .sort((a, b) => Number(b.revenue ?? 0) - Number(a.revenue ?? 0))
    .slice(0, 5)
    .map((row) => ({
      date: row.date,
      revenue: roundNumber(Number(row.revenue ?? 0)),
      transactions: Number(row.transactions ?? 0),
    }));

  return {
    days: rows.length,
    firstDate: rows[0]?.date ?? null,
    lastDate: rows.at(-1)?.date ?? null,
    totalRevenue: roundNumber(totalRevenue),
    totalTransactions,
    averageRevenuePerDay: rows.length ? roundNumber(totalRevenue / rows.length) : 0,
    topRevenueDays,
  };
}

function compactReportData(reportData?: ReportData) {
  if (!reportData) return null;

  const { dailyRevenue = [], ...rest } = reportData;
  return {
    ...rest,
    dailyRevenueSummary: buildDailyRevenueSummary(dailyRevenue),
  };
}

function buildSystemPrompt(reportData: ReportData | undefined, deep: boolean) {
  const compactReport = compactReportData(reportData);

  return deep
    ? `You are a senior business consultant specializing in barbershop analytics.
You have access to summarized report data only. Provide a thorough, multi-paragraph analysis.
Reference specific numbers, identify patterns, and give concrete actionable recommendations.

REPORT SUMMARY:
${JSON.stringify(compactReport)}

RULES:
- You assist with ALL questions related to business, revenue, appointments, services, staff, customers, growth, marketing, operations, and barbershop industry advice.
- If the user asks something completely unrelated to business or barbershops, respond with: "I can only assist with questions related to your barbershop business data and performance."
- When data is available in the report, reference it. When it is not, use general barbershop business knowledge to answer.
- Always use PHP as currency notation unless prompted for another currency.`
    : `You are an AI business analyst for a barbershop.

REPORT SUMMARY:
${JSON.stringify(compactReport)}

Answer the user's question in 2-3 sentences. Reference actual numbers from the data when relevant.

RULES:
- You assist with ALL questions related to business, revenue, appointments, services, staff, customers, growth, marketing, operations, and barbershop industry advice.
- If the user asks something completely unrelated to business or barbershops, respond with: "I can only assist with questions related to your barbershop business data and performance."
- When data is available in the report, reference it. When it is not, use general barbershop business knowledge to answer.
- Always use PHP as currency notation unless prompted for another currency.`;
}

function estimateChatCost({
  messages,
  reportData,
  deep,
}: {
  messages: ChatMessage[];
  reportData?: ReportData;
  deep: boolean;
}) {
  const model = deep ? "gpt-4o" : "gpt-4o-mini";
  const maxOutputTokens = deep ? 2000 : 500;
  const systemPrompt = buildSystemPrompt(reportData, deep);
  const serializedMessages = JSON.stringify([
    { role: "system", content: systemPrompt },
    ...messages,
  ]);
  const estimatedInputTokens = estimatePromptTokens(serializedMessages);
  const estimate = calculateOpenAICost({
    model,
    inputTokens: estimatedInputTokens,
    outputTokens: maxOutputTokens,
  });

  return {
    model,
    estimatedInputTokens: estimate.inputTokens,
    estimatedOutputTokens: estimate.outputTokens,
    estimatedTotalTokens: estimate.totalTokens,
    estimatedInputCostUSD: estimate.inputCostUSD,
    estimatedOutputCostUSD: estimate.outputCostUSD,
    estimatedTotalCostUSD: estimate.totalCostUSD,
    exchangeRatePHP: estimate.exchangeRatePHP,
    estimatedTotalCostPHP: estimate.totalCostPHP,
    maxOutputTokens,
    isEstimate: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAdminUser();
    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { messages, reportData } = (await req.json()) as {
      messages?: ChatMessage[];
      reportData?: ReportData;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    return NextResponse.json({
      regular: estimateChatCost({ messages, reportData, deep: false }),
      deep: estimateChatCost({ messages, reportData, deep: true }),
    });
  } catch (error) {
    console.error("AI report chat estimate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
