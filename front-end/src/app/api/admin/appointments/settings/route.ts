import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getAdminUser } from "@/lib/supabase/getUser";

export async function GET() {
  try {
    const user = await getAdminUser()
      if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

    let settings = await db.appointmentSetting.findFirst();

    if (!settings) {
      settings = await db.appointmentSetting.create({
        data: { bookingCutoffHours: 1 },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch appointment settings:", error)
    return NextResponse.json({ error: "Failed to fetch appointment settings" }, { status: 500} )
  }
}