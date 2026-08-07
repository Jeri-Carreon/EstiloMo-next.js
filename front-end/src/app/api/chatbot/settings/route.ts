import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fallbackChatbotSettings } from "@/lib/chatbotSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await db.chatbotSetting.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUBLIC CHATBOT SETTINGS GET ERROR:", error);

    return NextResponse.json(fallbackChatbotSettings);
  }
}
