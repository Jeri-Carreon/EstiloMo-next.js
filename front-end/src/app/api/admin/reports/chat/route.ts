import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
import { hasAnyRole } from "@/lib/adminTabs";
import { getReportServiceClientConfig } from "@/server/reports-api/config";
import type {
  ReportChatMessage,
  ReportChatSuccessResponse,
} from "@/server/reports-api/types/reports";

type ChatMsg = {
  role: "user" | "assistant" | "system";
  text?: string;
  content?: string;
};

type ReportRequest = {
  from?: string;
  to?: string;
  dateRange?: string;
};

function parseReportRequest(reportRequest?: ReportRequest) {
  const startDate = new Date(reportRequest?.from ?? Date.now());
  const endDate = new Date(reportRequest?.to ?? reportRequest?.from ?? Date.now());
  endDate.setHours(23, 59, 59, 999);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate > endDate
  ) {
    const now = new Date();
    return { startDate: now, endDate: now };
  }

  return { startDate, endDate };
}

function normalizeMessages(messages: ChatMsg[]): ReportChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content ?? message.text ?? "",
  }));
}

async function requestExternalReportChat({
  messages,
  reportData,
  deep,
}: {
  messages: ReportChatMessage[];
  reportData?: Record<string, unknown>;
  deep: boolean;
}) {
  const { chatUrl, apiKey } = getReportServiceClientConfig();

  const response = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages,
      reportData,
      deep,
    }),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("AI report chat service request failed:", {
      status: response.status,
      statusText: response.statusText,
      error: data?.error,
    });

    throw new Error(
      data?.error?.message ||
        data?.error ||
        "AI report chat service request failed.",
    );
  }

  return data as ReportChatSuccessResponse;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAdminUser();
    if (!hasAnyRole(user, ["OWNER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { messages, reportData, reportRequest, deep } = (await req.json()) as {
      messages: ChatMsg[];
      reportData?: Record<string, unknown>;
      reportRequest?: ReportRequest;
      deep?: boolean;
    };

    const chatResponse = await requestExternalReportChat({
      messages: normalizeMessages(messages),
      reportData,
      deep: deep === true,
    });
    const { startDate, endDate } = parseReportRequest(reportRequest);

    await db.aIReportLog.create({
      data: {
        dateFrom: startDate,
        dateTo: endDate,
        reportType: deep ? "deep_chat" : "chat",
        model: chatResponse.model,
        inputTokens: chatResponse.cost.inputTokens,
        outputTokens: chatResponse.cost.outputTokens,
        totalTokens: chatResponse.cost.totalTokens,
        inputCostUSD: chatResponse.cost.inputCostUSD,
        outputCostUSD: chatResponse.cost.outputCostUSD,
        totalCostUSD: chatResponse.cost.totalCostUSD,
        exchangeRatePHP: chatResponse.cost.exchangeRatePHP,
        totalCostPHP: chatResponse.cost.totalCostPHP,
        generatedBy: user.id,
      },
    });

    return NextResponse.json({
      reply: chatResponse.reply,
      model: chatResponse.model,
      usage: {
        prompt_tokens: chatResponse.usage.promptTokens,
        completion_tokens: chatResponse.usage.completionTokens,
        total_tokens: chatResponse.usage.totalTokens,
      },
      cost: chatResponse.cost,
    });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
