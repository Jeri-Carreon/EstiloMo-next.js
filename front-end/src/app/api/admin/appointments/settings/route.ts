import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/getUser";
import { ensureSingleAppointmentSetting } from "@/lib/appointmentSettings";

export async function GET() {
  try {
    const user = await getAdminUser()
      if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

    const settings = await ensureSingleAppointmentSetting();

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch appointment settings:", error)
    return NextResponse.json({ error: "Failed to fetch appointment settings" }, { status: 500} )
  }
}