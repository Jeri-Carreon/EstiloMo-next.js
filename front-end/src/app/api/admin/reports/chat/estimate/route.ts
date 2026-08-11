import { NextRequest, NextResponse } from "next/server";

import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";
import { ReportsService } from "@/server/reports-api/services/reports.service";
import type { ReportChatMessage } from "@/server/reports-api/types/reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

const reportsService = new ReportsService();

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminTabAccess("reports", req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const { messages, reportData } = (await req.json()) as {
      messages?: ChatMessage[];
      reportData?: Record<string, unknown>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const estimate = reportsService.estimateChat({
      messages: normalizeMessages(messages),
      reportData,
    });

    return NextResponse.json(estimate);
  } catch (error) {
    console.error("AI report chat estimate error:", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
