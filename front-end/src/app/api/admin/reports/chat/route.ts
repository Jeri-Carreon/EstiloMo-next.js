import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  try {
    const user = await getAdminUser();
    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { messages, reportData, deep } = (await req.json()) as {
      messages: ChatMessage[];
      reportData?: ReportData;
      deep?: boolean;
    };
    const compactReport = compactReportData(reportData);

    const systemPrompt = deep
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

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: deep ? "gpt-4o" : "gpt-4o-mini",
        max_tokens: deep ? 2000 : 500,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI error:", errText);
      return NextResponse.json({ error: "OpenAI request failed" }, { status: 500 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "Unable to generate a response.";
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
