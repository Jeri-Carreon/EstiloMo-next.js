import { NextRequest, NextResponse } from "next/server";

import { authenticateApi } from "../middleware/authenticateApi";
import {
  validateAnalyzeReportRequest,
  validateReportChatRequest,
} from "../schemas/reports.schema";
import { ReportsService } from "../services/reports.service";
import { ApiError, toErrorMessage } from "../utils/api-error";

export class ReportsController {
  constructor(private readonly reportsService = new ReportsService()) {}

  async estimate(req: NextRequest): Promise<NextResponse> {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();

    try {
      authenticateApi(req);

      const body = await req.json();
      const request = validateAnalyzeReportRequest(body);
      const response = this.reportsService.estimateReport(request);
      const latencyMs = Math.round(performance.now() - startedAt);

      console.info("AI report estimate generated", {
        requestId,
        latencyMs,
        reportType: request.reportType,
        model: response.model,
        estimatedTotalTokens: response.estimatedTotalTokens,
        estimatedTotalCostUSD: response.estimatedTotalCostUSD,
      });

      return NextResponse.json(response);
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startedAt);
      const status = error instanceof ApiError ? error.status : 500;
      const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
      const message =
        error instanceof ApiError ? error.message : toErrorMessage(error);

      console.error("AI report estimate request failed", {
        requestId,
        latencyMs,
        code,
        status,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code,
            message,
          },
        },
        { status },
      );
    }
  }

  async analyze(req: NextRequest): Promise<NextResponse> {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();

    try {
      authenticateApi(req);

      const body = await req.json();
      const request = validateAnalyzeReportRequest(body);
      const response = await this.reportsService.analyzeReport(request);
      const latencyMs = Math.round(performance.now() - startedAt);

      console.info("AI report generated", {
        requestId,
        latencyMs,
        reportType: request.reportType,
        model: response.model,
        tokenUsage: response.usage,
      });

      return NextResponse.json(response);
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startedAt);
      const status = error instanceof ApiError ? error.status : 500;
      const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
      const message =
        error instanceof ApiError ? error.message : toErrorMessage(error);

      console.error("AI report request failed", {
        requestId,
        latencyMs,
        code,
        status,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code,
            message,
          },
        },
        { status },
      );
    }
  }

  async chat(req: NextRequest): Promise<NextResponse> {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();

    try {
      authenticateApi(req);

      const body = await req.json();
      const request = validateReportChatRequest(body);
      const response = await this.reportsService.chat(request);
      const latencyMs = Math.round(performance.now() - startedAt);

      console.info("AI report chat generated", {
        requestId,
        latencyMs,
        model: response.model,
        tokenUsage: response.usage,
      });

      return NextResponse.json(response);
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startedAt);
      const status = error instanceof ApiError ? error.status : 500;
      const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
      const message =
        error instanceof ApiError ? error.message : toErrorMessage(error);

      console.error("AI report chat request failed", {
        requestId,
        latencyMs,
        code,
        status,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code,
            message,
          },
        },
        { status },
      );
    }
  }

  async chatEstimate(req: NextRequest): Promise<NextResponse> {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();

    try {
      authenticateApi(req);

      const body = await req.json();
      const request = validateReportChatRequest(body);
      const response = this.reportsService.estimateChat(request);
      const latencyMs = Math.round(performance.now() - startedAt);

      console.info("AI report chat estimate generated", {
        requestId,
        latencyMs,
        regularModel: response.regular.model,
        deepModel: response.deep.model,
      });

      return NextResponse.json(response);
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startedAt);
      const status = error instanceof ApiError ? error.status : 500;
      const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
      const message =
        error instanceof ApiError ? error.message : toErrorMessage(error);

      console.error("AI report chat estimate request failed", {
        requestId,
        latencyMs,
        code,
        status,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code,
            message,
          },
        },
        { status },
      );
    }
  }
}
