import { NextRequest } from "next/server";

import { ApiError } from "../utils/api-error";

function readBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null;

  const [scheme, token] = headerValue.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

export function authenticateApi(req: NextRequest): void {
  const expectedApiKey = process.env.REPORTS_API_KEY?.trim();

  if (!expectedApiKey) {
    throw new ApiError(
      "API_KEY_NOT_CONFIGURED",
      "Report API authentication is not configured.",
      500,
    );
  }

  const providedApiKey =
    readBearerToken(req.headers.get("authorization")) ??
    req.headers.get("x-api-key")?.trim();

  if (!providedApiKey || providedApiKey !== expectedApiKey) {
    throw new ApiError("UNAUTHORIZED", "Invalid or missing API key.", 401);
  }
}
