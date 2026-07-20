import { NextResponse } from "next/server";
import { ensureSingleAppointmentSetting } from "@/lib/appointmentSettings";
import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";

export async function GET() {
  try {
    const auth = await requireAdminTabAccess("appointments");

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const settings = await ensureSingleAppointmentSetting();

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch appointment settings:", error)
    return NextResponse.json({ error: "Failed to fetch appointment settings" }, { status: 500} )
  }
}
