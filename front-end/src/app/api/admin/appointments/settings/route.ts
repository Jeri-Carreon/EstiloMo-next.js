import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  let settings = await db.appointmentSetting.findFirst();

  if (!settings) {
    settings = await db.appointmentSetting.create({
      data: { bookingCutoffHours: 1 },
    });
  }

  return NextResponse.json(settings);
}