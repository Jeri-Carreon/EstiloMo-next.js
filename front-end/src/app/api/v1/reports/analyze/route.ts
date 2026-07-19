import { NextRequest, NextResponse } from "next/server";

import { ReportsController } from "@/server/reports-api/controllers/reports.controller";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const controller = new ReportsController();

export async function GET() {
  return NextResponse.json({
    success: true,
    endpoint: "/api/v1/reports/analyze",
    method: "POST",
    message: "Use POST with a JSON body to generate report analysis.",
  });
}

export async function POST(req: NextRequest) {
  return controller.analyze(req);
}
