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

export async function PUT(req: Request) {
  try {
    const user = await getAdminUser();
    if (!hasAnyRole(user, ["OWNER", "RECEPTIONIST"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { vatRate } = await req.json();
    const normalizedVatRate = Number(vatRate);
    if (!Number.isFinite(normalizedVatRate) || normalizedVatRate < 0 || normalizedVatRate > 1) {
      return NextResponse.json({ error: "Invalid VAT rate" }, { status: 400 });
    }

    const settings = await ensureSingleAppointmentSetting({ vatRate: normalizedVatRate });
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to save appointment VAT setting:", error);
    return NextResponse.json({ error: "Failed to save VAT setting" }, { status: 500 });
  }
}
