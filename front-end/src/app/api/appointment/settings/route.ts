import { NextResponse } from "next/server";
import { getVatRate } from "@/lib/appointmentSettings";

export async function GET() {
  return NextResponse.json({ vatRate: await getVatRate() });
}
