import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const defaultSettings = [
  {
    key: "greeting",
    label: "Greeting / Main Menu",
    response:
      "Welcome to The Barbs Bro!\n\nI am your virtual assistant. I can help you with inquiries regarding our barbershop!\n\nHow may I help you today?",
  },
  {
    key: "fallback",
    label: "Fallback Response",
    response:
      "Sorry, I can only answer questions about The Barbs Bro services, prices, location, operating hours, social media, and appointment guidance.",
  },
];

const protectedKeys = ["greeting", "fallback"];
const legacyAiGreeting =
  "Welcome to The Barbs Bro!\n\nI am your AI chatbot assistant. I can help you with inquiries regarding our barbershop!\n\nHow may I help you today?";
const virtualAssistantGreeting =
  "Welcome to The Barbs Bro!\n\nI am your virtual assistant. I can help you with inquiries regarding our barbershop!\n\nHow may I help you today?";

async function ensureDefaults() {
  for (const item of defaultSettings) {
    await db.chatbotSetting.upsert({
      where: { key: item.key },
      update: {},
      create: item,
    });
  }

  await db.chatbotSetting.updateMany({
    where: {
      key: "greeting",
      response: legacyAiGreeting,
    },
    data: {
      response: virtualAssistantGreeting,
    },
  });
}

export async function GET() {
  try {
    await ensureDefaults();

    const settings = await db.chatbotSetting.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("CHATBOT SETTINGS GET ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load chatbot settings." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!Array.isArray(body?.settings)) {
      return NextResponse.json(
        { error: "Invalid request body. Expected settings array." },
        { status: 400 }
      );
    }

    for (const item of body.settings) {
      if (!item?.key || !item?.label || typeof item?.response !== "string") {
        continue;
      }

      await db.chatbotSetting.upsert({
        where: { key: item.key },
        update: {
          label: item.label,
          response: item.response,
          options: item.options ?? undefined,
        },
        create: {
          key: item.key,
          label: item.label,
          response: item.response,
          options: item.options ?? undefined,
        },
      });
    }

    const settings = await db.chatbotSetting.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      message: "Chatbot settings saved successfully.",
      settings,
    });
  } catch (error) {
    console.error("CHATBOT SETTINGS PUT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to save chatbot settings." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body?.key) {
      return NextResponse.json({ error: "Missing key." }, { status: 400 });
    }

    if (protectedKeys.includes(body.key)) {
      return NextResponse.json(
        { error: "Greeting and fallback cannot be deleted." },
        { status: 400 }
      );
    }

    await db.chatbotSetting.delete({
      where: { key: body.key },
    });

    const settings = await db.chatbotSetting.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      message: "Option deleted successfully.",
      settings,
    });
  } catch (error) {
    console.error("CHATBOT SETTINGS DELETE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete chatbot option." },
      { status: 500 }
    );
  }
}
