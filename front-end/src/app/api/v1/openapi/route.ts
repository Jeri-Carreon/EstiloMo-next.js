import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const serverUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "EstiloMo AI Report Service API",
      version: "1.0.0",
      description:
        "Reusable AI report analysis API. The service accepts structured analytics JSON and returns AI-generated report insights without querying application databases.",
    },
    servers: [
      {
        url: serverUrl.replace(/\/$/, ""),
      },
    ],
    components: {
      securitySchemes: {
        bearerApiKey: {
          type: "http",
          scheme: "bearer",
        },
        xApiKey: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
      },
      schemas: {
        AnalyzeReportRequest: {
          type: "object",
          required: ["reportType", "dateRange", "analytics"],
          properties: {
            reportType: { type: "string", example: "summary" },
            dateRange: {
              type: "object",
              required: ["from", "to"],
              properties: {
                from: { type: "string", format: "date", example: "2026-07-01" },
                to: { type: "string", format: "date", example: "2026-07-19" },
              },
            },
            analytics: {
              type: "object",
              description:
                "Structured analytics JSON produced by buildAIReportAnalytics().",
              example: {
                reportPeriod: {
                  dateFrom: "2026-07-01",
                  dateTo: "2026-07-19",
                  dateRange: "Jul 1, 2026 - Jul 19, 2026",
                  days: 19,
                  comparisonDateFrom: "2026-06-12",
                  comparisonDateTo: "2026-06-30",
                  trendGranularity: "weekly",
                },
                financial: {
                  totalRevenue: 12500,
                  totalTransactions: 25,
                  averageTransactionValue: 500,
                  avgRevenuePerDay: 657.89,
                },
              },
            },
          },
        },
        AnalyzeReportSuccess: {
          type: "object",
          required: ["success", "analysis", "usage", "model", "generatedAt"],
          properties: {
            success: { type: "boolean", example: true },
            analysis: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      icon: { type: "string", example: "📈" },
                      title: { type: "string", example: "Revenue Growth" },
                      body: {
                        type: "string",
                        example: "Revenue improved compared with the previous period.",
                      },
                    },
                  },
                },
                revenueTrend: { type: "number", example: 12 },
                avgTrend: { type: "number", example: 8 },
                apptTrend: { type: "number", example: 5 },
                rateTrend: { type: "number", example: 3 },
                weeklyInsight: { type: "string" },
                serviceRecommendation: { type: "string" },
              },
            },
            usage: {
              type: "object",
              properties: {
                promptTokens: { type: "number", example: 1200 },
                completionTokens: { type: "number", example: 350 },
                totalTokens: { type: "number", example: 1550 },
                estimatedCostUSD: { type: "number", example: 0.0065 },
                estimatedCostPHP: { type: "number", example: 0.3965 },
              },
            },
            model: { type: "string", example: "gpt-4o" },
            generatedAt: {
              type: "string",
              format: "date-time",
              example: "2026-07-19T13:30:00.000Z",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "INVALID_DATE_RANGE" },
                message: {
                  type: "string",
                  example: "dateRange.from and dateRange.to must be valid dates.",
                },
              },
            },
          },
        },
      },
    },
    paths: {
      "/api/v1/reports/analyze": {
        post: {
          summary: "Generate AI report analysis from analytics JSON",
          security: [{ bearerApiKey: [] }, { xApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnalyzeReportRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Report generated successfully.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AnalyzeReportSuccess" },
                },
              },
            },
            "400": {
              description: "Invalid request body.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "401": {
              description: "Missing or invalid API key.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "500": {
              description: "Server configuration or processing error.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "502": {
              description: "OpenAI request or response error.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/reports/estimate": {
        post: {
          summary: "Estimate AI report analysis cost from analytics JSON",
          security: [{ bearerApiKey: [] }, { xApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnalyzeReportRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Estimate generated successfully." },
            "400": { description: "Invalid request body." },
            "401": { description: "Missing or invalid API key." },
            "500": { description: "Server configuration or processing error." },
          },
        },
      },
      "/api/v1/reports/chat": {
        post: {
          summary: "Generate AI chat response from report context",
          security: [{ bearerApiKey: [] }, { xApiKey: [] }],
          responses: {
            "200": { description: "Chat response generated successfully." },
            "400": { description: "Invalid request body." },
            "401": { description: "Missing or invalid API key." },
            "502": { description: "OpenAI request error." },
          },
        },
      },
      "/api/v1/reports/chat/estimate": {
        post: {
          summary: "Estimate AI report chat cost",
          security: [{ bearerApiKey: [] }, { xApiKey: [] }],
          responses: {
            "200": { description: "Chat estimate generated successfully." },
            "400": { description: "Invalid request body." },
            "401": { description: "Missing or invalid API key." },
            "500": { description: "Server configuration or processing error." },
          },
        },
      },
    },
  });
}
