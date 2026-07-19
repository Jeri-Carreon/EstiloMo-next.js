import type {
  ReportAnalysis,
  ReportAnalyzeRequest,
  ReportAnalyzeSuccessResponse,
  ReportChatCostEstimate,
  ReportChatEstimateSuccessResponse,
  ReportChatRequest,
  ReportChatSuccessResponse,
  ReportEstimateSuccessResponse,
} from "../types/reports";
import { ApiError } from "../utils/api-error";
import { OpenAIService } from "./openai.service";
import { ANALYSIS_MODEL } from "@/lib/openai";
import { calculateOpenAICost } from "@/lib/openaiPricing";
import {
  buildReportChatSystemPrompt,
  buildReportAnalysisPrompt,
  estimatePromptTokens,
  REPORT_ANALYSIS_MAX_OUTPUT_TOKENS,
} from "./prompt.service";

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseAnalysisJson(value: string): ReportAnalysis {
  const clean = value.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(clean) as Record<string, unknown>;
  const insights = Array.isArray(parsed.insights)
    ? parsed.insights.slice(0, 3).map((insight) => {
        const item =
          insight && typeof insight === "object"
            ? (insight as Record<string, unknown>)
            : {};

        return {
          icon: stringOrEmpty(item.icon),
          title: stringOrEmpty(item.title),
          body: stringOrEmpty(item.body),
        };
      })
    : [];

  return {
    insights,
    revenueTrend: numberOrZero(parsed.revenueTrend),
    avgTrend: numberOrZero(parsed.avgTrend),
    apptTrend: numberOrZero(parsed.apptTrend),
    rateTrend: numberOrZero(parsed.rateTrend),
    weeklyInsight: stringOrEmpty(parsed.weeklyInsight),
    serviceRecommendation: stringOrEmpty(parsed.serviceRecommendation),
  };
}

type DailyRevenuePoint = {
  date: string;
  revenue: number;
  transactions: number;
};

function roundNumber(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isDailyRevenuePoint(value: unknown): value is DailyRevenuePoint {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;

  return (
    typeof row.date === "string" &&
    typeof row.revenue === "number" &&
    typeof row.transactions === "number"
  );
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

function compactReportData(reportData?: Record<string, unknown>) {
  if (!reportData) return null;

  const { dailyRevenue, ...rest } = reportData;
  const dailyRevenueRows = Array.isArray(dailyRevenue)
    ? dailyRevenue.filter(isDailyRevenuePoint)
    : [];

  return {
    ...rest,
    dailyRevenueSummary: buildDailyRevenueSummary(dailyRevenueRows),
  };
}

export class ReportsService {
  constructor(private readonly openAIService = new OpenAIService()) {}

  estimateReport(request: ReportAnalyzeRequest): ReportEstimateSuccessResponse {
    const prompt = buildReportAnalysisPrompt(request.analytics);
    const estimatedInputTokens = estimatePromptTokens(prompt);
    const estimatedOutputTokens = REPORT_ANALYSIS_MAX_OUTPUT_TOKENS;
    const estimate = calculateOpenAICost({
      model: ANALYSIS_MODEL,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
    });

    return {
      success: true,
      model: ANALYSIS_MODEL,
      estimatedInputTokens: estimate.inputTokens,
      estimatedOutputTokens: estimate.outputTokens,
      estimatedTotalTokens: estimate.totalTokens,
      estimatedInputCostUSD: estimate.inputCostUSD,
      estimatedOutputCostUSD: estimate.outputCostUSD,
      estimatedTotalCostUSD: estimate.totalCostUSD,
      exchangeRatePHP: estimate.exchangeRatePHP,
      estimatedTotalCostPHP: estimate.totalCostPHP,
      maxOutputTokens: REPORT_ANALYSIS_MAX_OUTPUT_TOKENS,
      isEstimate: true,
    };
  }

  async analyzeReport(
    request: ReportAnalyzeRequest,
  ): Promise<ReportAnalyzeSuccessResponse> {
    const prompt = buildReportAnalysisPrompt(request.analytics);
    const completion = await this.openAIService.generateReportAnalysis(prompt);

    try {
      const analysis = parseAnalysisJson(completion.content);

      return {
        success: true,
        analysis,
        usage: {
          promptTokens: completion.cost.inputTokens,
          completionTokens: completion.cost.outputTokens,
          totalTokens: completion.cost.totalTokens,
          estimatedCostUSD: completion.cost.totalCostUSD,
          estimatedCostPHP: completion.cost.totalCostPHP,
        },
        model: completion.model,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to parse report analysis JSON:", error);

      throw new ApiError(
        "INVALID_AI_RESPONSE",
        "The AI service returned an invalid report response.",
        502,
      );
    }
  }

  async chat(request: ReportChatRequest): Promise<ReportChatSuccessResponse> {
    const compactReport = compactReportData(request.reportData);
    const systemPrompt = buildReportChatSystemPrompt({
      reportData: compactReport,
      deep: request.deep === true,
    });
    const completion = await this.openAIService.generateReportChat({
      deep: request.deep === true,
      messages: [
        { role: "system", content: systemPrompt },
        ...request.messages,
      ],
    });

    return {
      success: true,
      reply: completion.content,
      model: completion.model,
      usage: {
        promptTokens: completion.usage.inputTokens,
        completionTokens: completion.usage.outputTokens,
        totalTokens: completion.usage.totalTokens,
      },
      cost: completion.cost,
      generatedAt: new Date().toISOString(),
    };
  }

  estimateChat(request: ReportChatRequest): ReportChatEstimateSuccessResponse {
    return {
      success: true,
      regular: this.estimateChatCost({ ...request, deep: false }),
      deep: this.estimateChatCost({ ...request, deep: true }),
    };
  }

  private estimateChatCost(
    request: ReportChatRequest,
  ): ReportChatCostEstimate {
    const deep = request.deep === true;
    const model = deep ? "gpt-4o" : "gpt-4o-mini";
    const maxOutputTokens = deep ? 2000 : 500;
    const compactReport = compactReportData(request.reportData);
    const systemPrompt = buildReportChatSystemPrompt({
      reportData: compactReport,
      deep,
    });
    const serializedMessages = JSON.stringify([
      { role: "system", content: systemPrompt },
      ...request.messages,
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
}
