import { NextRequest, NextResponse } from "next/server";

import { getAdminUser } from "@/lib/supabase/getUser";
import { getReportServiceClientConfig } from "@/server/reports-api/config";
import type {
  ReportChatEstimateSuccessResponse,
  ReportChatMessage,
} from "@/server/reports-api/types/reports";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function normalizeMessages(messages: ChatMessage[]): ReportChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

async function requestExternalReportChatEstimate({
  messages,
  reportData,
}: {
  messages: ReportChatMessage[];
  reportData?: Record<string, unknown>;
}) {
  const { chatEstimateUrl, apiKey } = getReportServiceClientConfig();

  const response = await fetch(chatEstimateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages,
      reportData,
    }),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("AI report chat estimate service request failed:", {
      status: response.status,
      statusText: response.statusText,
      error: data?.error,
    });

    throw new Error(
      data?.error?.message ||
        data?.error ||
        "AI report chat estimate service request failed.",
    );
  }

  return data as ReportChatEstimateSuccessResponse;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAdminUser();
    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { messages, reportData } = (await req.json()) as {
      messages?: ChatMessage[];
      reportData?: Record<string, unknown>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const estimate = await requestExternalReportChatEstimate({
      messages: normalizeMessages(messages),
      reportData,
    });

    return NextResponse.json({
      regular: estimate.regular,
      deep: estimate.deep,
    });
  } catch (error) {
    console.error("AI report chat estimate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
