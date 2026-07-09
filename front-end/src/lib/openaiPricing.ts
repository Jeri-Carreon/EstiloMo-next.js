export type OpenAIModelPricing = {
  model: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
};

const configuredUsdToPhp = Number(process.env.USD_TO_PHP);

export const USD_TO_PHP =
  Number.isFinite(configuredUsdToPhp) && configuredUsdToPhp > 0
    ? configuredUsdToPhp
    : 61;

export const OPENAI_PRICING: Record<string, OpenAIModelPricing> = {
  "gpt-4o": {
    model: "gpt-4o",
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10,
  },
  "gpt-4o-mini": {
    model: "gpt-4o-mini",
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
  },
};

type CostInput = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

export function getOpenAIPricing(model: string): OpenAIModelPricing {
  const exact = OPENAI_PRICING[model];
  if (exact) return exact;

  const fallback = Object.values(OPENAI_PRICING).find((pricing) =>
    model.startsWith(pricing.model),
  );

  if (!fallback) {
    throw new Error(`Missing OpenAI pricing configuration for model: ${model}`);
  }

  return fallback;
}

export function calculateOpenAICost({
  model,
  inputTokens,
  outputTokens,
  totalTokens,
}: CostInput) {
  const pricing = getOpenAIPricing(model);
  const inputCostUSD = roundMoney(
    (inputTokens / 1_000_000) * pricing.inputPricePerMillion,
  );
  const outputCostUSD = roundMoney(
    (outputTokens / 1_000_000) * pricing.outputPricePerMillion,
  );
  const totalCostUSD = roundMoney(inputCostUSD + outputCostUSD);
  const exchangeRatePHP = roundMoney(USD_TO_PHP);
  const totalCostPHP = roundMoney(totalCostUSD * exchangeRatePHP);

  return {
    model,
    inputTokens,
    outputTokens,
    totalTokens: totalTokens ?? inputTokens + outputTokens,
    inputCostUSD,
    outputCostUSD,
    totalCostUSD,
    exchangeRatePHP,
    totalCostPHP,
  };
}
