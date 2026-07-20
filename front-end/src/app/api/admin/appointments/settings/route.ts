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

export async function PUT(req: Request) {
  try {
    const auth = await requireAdminTabAccess("appointments", req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
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
