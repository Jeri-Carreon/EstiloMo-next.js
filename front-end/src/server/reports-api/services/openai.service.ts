import { ANALYSIS_MODEL } from "@/lib/openai";
import { calculateOpenAICost } from "@/lib/openaiPricing";

import type { ReportChatMessage } from "../types/reports";
import { ApiError } from "../utils/api-error";
import { REPORT_ANALYSIS_MAX_OUTPUT_TOKENS } from "./prompt.service";

type ChatUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
};

type ChatCompletionResponse = {
  model?: string;
  usage?: ChatUsage;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export type OpenAIReportCompletion = {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: ReturnType<typeof calculateOpenAICost>;
};

function extractUsage(usage?: ChatUsage) {
  const inputTokens = Number(usage?.prompt_tokens ?? usage?.input_tokens ?? 0);
  const outputTokens = Number(
    usage?.completion_tokens ?? usage?.output_tokens ?? 0,
  );
  const totalTokens = Number(usage?.total_tokens ?? inputTokens + outputTokens);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

export class OpenAIService {
  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY?.trim(),
    private readonly model = ANALYSIS_MODEL,
  ) {}

  async generateReportAnalysis(prompt: string): Promise<OpenAIReportCompletion> {
    if (!this.apiKey) {
      throw new ApiError(
        "OPENAI_API_KEY_NOT_CONFIGURED",
        "OpenAI API key is not configured.",
        500,
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: REPORT_ANALYSIS_MAX_OUTPUT_TOKENS,
        temperature: 0.2,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const responseText = await response.text();

      console.error("OpenAI report request failed:", {
        status: response.status,
        statusText: response.statusText,
        response: responseText,
      });

      throw new ApiError(
        "OPENAI_REQUEST_FAILED",
        "OpenAI request failed.",
        502,
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const responseModel = data.model ?? this.model;
    const usage = extractUsage(data.usage);
    const cost = calculateOpenAICost({
      model: responseModel,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    });

    return {
      content: data.choices?.[0]?.message?.content ?? "{}",
      model: responseModel,
      usage,
      cost,
    };
  }

  async generateReportChat({
    messages,
    deep,
  }: {
    messages: ReportChatMessage[];
    deep: boolean;
  }): Promise<OpenAIReportCompletion> {
    if (!this.apiKey) {
      throw new ApiError(
        "OPENAI_API_KEY_NOT_CONFIGURED",
        "OpenAI API key is not configured.",
        500,
      );
    }

    const model = deep ? "gpt-4o" : "gpt-4o-mini";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: deep ? 2000 : 500,
        messages,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const responseText = await response.text();

      console.error("OpenAI report chat request failed:", {
        status: response.status,
        statusText: response.statusText,
        response: responseText,
      });

      throw new ApiError(
        "OPENAI_REQUEST_FAILED",
        "OpenAI request failed.",
        502,
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const responseModel = data.model ?? model;
    const usage = extractUsage(data.usage);
    const cost = calculateOpenAICost({
      model: responseModel,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    });

    return {
      content:
        data.choices?.[0]?.message?.content ??
        "Unable to generate a response.",
      model: responseModel,
      usage,
      cost,
    };
  }
}
