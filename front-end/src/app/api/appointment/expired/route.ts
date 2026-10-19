import { NextResponse } from "next/server";
import { cleanupDormantAppointments } from "@/lib/cleanupDormantAppointments";

export async function POST() {
  try {
    const result = await cleanupDormantAppointments();
    if (result.issues.length > 0) {
      console.warn("DORMANT BOOKING CLEANUP ISSUES:", result.issues);
    }
    return NextResponse.json({
      ok: true,
      expired: result.cancelledSales,
      saleIds: [...new Set(result.appointments.map((appointment) => appointment.saleId))],
    });
  } catch (error) {
    console.error("expire-pending error:", error);

    return NextResponse.json(
      { error: "Failed to expire pending payments" },
      { status: 500 }
    );
  }
}
