export type ReportDateRange = {
  from: string;
  to: string;
};

export type ReportAnalytics = Record<string, unknown>;

export type ReportAnalyzeRequest = {
  reportType: string;
  dateRange: ReportDateRange;
  analytics: ReportAnalytics;
};

export type ReportInsight = {
  icon: string;
  title: string;
  body: string;
};

export type ReportAnalysis = {
  insights: ReportInsight[];
  revenueTrend: number;
  avgTrend: number;
  apptTrend: number;
  rateTrend: number;
  weeklyInsight: string;
  serviceRecommendation: string;
};

export type ReportUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  estimatedCostPHP: number;
};

export type ReportAnalyzeSuccessResponse = {
  success: true;
  analysis: ReportAnalysis;
  usage: ReportUsage;
  model: string;
  generatedAt: string;
};

export type ReportEstimateSuccessResponse = {
  success: true;
  model: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  estimatedInputCostUSD: number;
  estimatedOutputCostUSD: number;
  estimatedTotalCostUSD: number;
  exchangeRatePHP: number;
  estimatedTotalCostPHP: number;
  maxOutputTokens: number;
  isEstimate: true;
};

export type ReportAnalyzeErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ReportChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ReportChatRequest = {
  messages: ReportChatMessage[];
  reportData?: Record<string, unknown>;
  deep?: boolean;
};

export type ReportChatSuccessResponse = {
  success: true;
  reply: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCostUSD: number;
    outputCostUSD: number;
    totalCostUSD: number;
    exchangeRatePHP: number;
    totalCostPHP: number;
  };
  generatedAt: string;
};

export type ReportChatCostEstimate = {
  model: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  estimatedInputCostUSD: number;
  estimatedOutputCostUSD: number;
  estimatedTotalCostUSD: number;
  exchangeRatePHP: number;
  estimatedTotalCostPHP: number;
  maxOutputTokens: number;
  isEstimate: true;
};

export type ReportChatEstimateSuccessResponse = {
  success: true;
  regular: ReportChatCostEstimate;
  deep: ReportChatCostEstimate;
};
