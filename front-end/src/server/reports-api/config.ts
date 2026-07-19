export type ReportServiceClientConfig = {
  analyzeUrl: string;
  estimateUrl: string;
  chatUrl: string;
  chatEstimateUrl: string;
  apiKey: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getReportServiceClientConfig(): ReportServiceClientConfig {
  const analyzeUrl = requireEnv("AI_REPORT_SERVICE_URL");
  const apiKey = requireEnv("REPORTS_API_KEY");

  return {
    analyzeUrl,
    estimateUrl: analyzeUrl.replace(/\/analyze\/?$/, "/estimate"),
    chatUrl: analyzeUrl.replace(/\/analyze\/?$/, "/chat"),
    chatEstimateUrl: analyzeUrl.replace(/\/analyze\/?$/, "/chat/estimate"),
    apiKey,
  };
}

export function validateReportServiceRuntimeConfig(): void {
  requireEnv("REPORTS_API_KEY");
  requireEnv("AI_REPORT_SERVICE_URL");
  requireEnv("OPENAI_API_KEY");
}
