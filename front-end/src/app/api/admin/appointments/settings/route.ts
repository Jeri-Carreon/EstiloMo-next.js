import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/getUser";
import { hasAnyRole } from "@/lib/adminTabs";
import { ensureSingleAppointmentSetting } from "@/lib/appointmentSettings";

export async function GET() {
  try {
    const user = await getAdminUser()
      if (!hasAnyRole(user, ["OWNER", "RECEPTIONIST"])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

    const settings = await ensureSingleAppointmentSetting();

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch appointment settings:", error)
    return NextResponse.json({ error: "Failed to fetch appointment settings" }, { status: 500} )
  }
}
