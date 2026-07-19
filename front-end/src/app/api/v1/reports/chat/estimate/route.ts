import { NextRequest } from "next/server";

import { ReportsController } from "@/server/reports-api/controllers/reports.controller";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const controller = new ReportsController();

export async function POST(req: NextRequest) {
  return controller.chatEstimate(req);
}
