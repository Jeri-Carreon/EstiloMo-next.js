import type {
  ReportAnalyzeRequest,
  ReportAnalytics,
  ReportChatMessage,
  ReportChatRequest,
} from "../types/reports";
import { ApiError } from "../utils/api-error";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;

  return !Number.isNaN(new Date(value).getTime());
}

function validateAnalytics(value: unknown): ReportAnalytics {
  if (!isPlainObject(value)) {
    throw new ApiError(
      "INVALID_ANALYTICS",
      "analytics must be a JSON object.",
      400,
    );
  }

  if (!isPlainObject(value.reportPeriod)) {
    throw new ApiError(
      "INVALID_ANALYTICS",
      "analytics.reportPeriod is required.",
      400,
    );
  }

  return value;
}

export function validateAnalyzeReportRequest(
  value: unknown,
): ReportAnalyzeRequest {
  if (!isPlainObject(value)) {
    throw new ApiError("INVALID_BODY", "Request body must be a JSON object.", 400);
  }

  if (typeof value.reportType !== "string" || !value.reportType.trim()) {
    throw new ApiError("INVALID_REPORT_TYPE", "reportType is required.", 400);
  }

  if (!isPlainObject(value.dateRange)) {
    throw new ApiError("INVALID_DATE_RANGE", "dateRange is required.", 400);
  }

  const { from, to } = value.dateRange;

  if (!isValidDateString(from) || !isValidDateString(to)) {
    throw new ApiError(
      "INVALID_DATE_RANGE",
      "dateRange.from and dateRange.to must be valid dates.",
      400,
    );
  }

  if (new Date(from) > new Date(to)) {
    throw new ApiError(
      "INVALID_DATE_RANGE",
      "dateRange.from must be before or equal to dateRange.to.",
      400,
    );
  }

  return {
    reportType: value.reportType.trim(),
    dateRange: {
      from,
      to,
    },
    analytics: validateAnalytics(value.analytics),
  };
}

function validateChatMessages(value: unknown): ReportChatMessage[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError(
      "INVALID_MESSAGES",
      "messages must be a non-empty array.",
      400,
    );
  }

  return value.map((message) => {
    if (!isPlainObject(message)) {
      throw new ApiError(
        "INVALID_MESSAGES",
        "Each message must be a JSON object.",
        400,
      );
    }

    if (
      message.role !== "user" &&
      message.role !== "assistant" &&
      message.role !== "system"
    ) {
      throw new ApiError(
        "INVALID_MESSAGES",
        "Each message role must be user, assistant, or system.",
        400,
      );
    }

    if (typeof message.content !== "string") {
      throw new ApiError(
        "INVALID_MESSAGES",
        "Each message content must be a string.",
        400,
      );
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
}

export function validateReportChatRequest(value: unknown): ReportChatRequest {
  if (!isPlainObject(value)) {
    throw new ApiError("INVALID_BODY", "Request body must be a JSON object.", 400);
  }

  return {
    messages: validateChatMessages(value.messages),
    reportData: isPlainObject(value.reportData) ? value.reportData : undefined,
    deep: value.deep === true,
  };
}
