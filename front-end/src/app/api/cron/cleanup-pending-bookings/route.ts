import { NextResponse } from "next/server";
import { cleanupDormantAppointments } from "@/lib/cleanupDormantAppointments";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanupDormantAppointments();
    if (result.issues.length > 0) {
      console.warn("DORMANT BOOKING CLEANUP ISSUES:", result.issues);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("DORMANT BOOKING CLEANUP ERROR:", error);
    return NextResponse.json({ error: "Failed to clean up dormant bookings" }, { status: 500 });
  }
}
