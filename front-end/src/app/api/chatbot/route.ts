import { NextRequest, NextResponse } from "next/server";

import { calculateOpenAICost, resolveChatbotOpenAIModel } from "@/lib/openaiPricing";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type ChatbotBody = {
  message?: string;
  model?: unknown;
};

type ChatUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

function extractUsage(usage?: ChatUsage) {
  const inputTokens = Number(usage?.prompt_tokens ?? 0);
  const outputTokens = Number(usage?.completion_tokens ?? 0);
  const totalTokens = Number(usage?.total_tokens ?? inputTokens + outputTokens);

  return { inputTokens, outputTokens, totalTokens };
}

function preview(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 500) : null;
}

async function getNullableUserId() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatbotBody;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const model = resolveChatbotOpenAIModel(body.model);

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 500 });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are the public chatbot for The Barbs Bro barbershop. Answer only questions about the shop, services, prices, appointments, barbers, location, hours, and contact guidance. If the question is unrelated, politely say you can only help with The Barbs Bro inquiries.",
          },
          { role: "user", content: message },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI chatbot error:", errText);
      return NextResponse.json({ error: "OpenAI request failed" }, { status: 500 });
    }

    const data = await res.json();
    const reply =
      data.choices?.[0]?.message?.content?.trim() ??
      "Sorry, I could not generate a response right now.";
    const usage = extractUsage(data.usage);
    const cost = calculateOpenAICost({
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    });

    await db.aIChatbotLog.create({
      data: {
        model,
        inputTokens: cost.inputTokens,
        outputTokens: cost.outputTokens,
        totalTokens: cost.totalTokens,
        inputCostUSD: cost.inputCostUSD,
        outputCostUSD: cost.outputCostUSD,
        totalCostUSD: cost.totalCostUSD,
        exchangeRatePHP: cost.exchangeRatePHP,
        totalCostPHP: cost.totalCostPHP,
        userId: await getNullableUserId(),
        messagePreview: preview(message),
        responsePreview: preview(reply),
      },
    });

    return NextResponse.json({
      ok: true,
      reply,
      model,
      usage: {
        prompt_tokens: usage.inputTokens,
        completion_tokens: usage.outputTokens,
        total_tokens: usage.totalTokens,
      },
      cost,
    });
  } catch (error) {
    console.error("Chatbot route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
