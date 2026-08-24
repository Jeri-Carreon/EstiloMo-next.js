import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminAuthorizationResponse, requireAdminTabAccess } from "@/lib/adminAuthorization";

export async function POST(req: Request) {
  try {
    const auth = await requireAdminTabAccess("loyaltyCard", req);
    if (auth.status !== 200) return adminAuthorizationResponse(auth.status);
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const value = Number(body.value);
    if (!name || !Number.isInteger(value) || value < 1 || value > 100) {
      return NextResponse.json({ error: "Enter a reward name and a discount from 1% to 100%." }, { status: 400 });
    }
    const option = await db.loyaltyRewardOption.create({ data: { name, value } });
    return NextResponse.json({ option }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") return NextResponse.json({ error: "That reward name or value already exists." }, { status: 409 });
    console.error("Create loyalty reward option error:", error);
    return NextResponse.json({ error: "Failed to create reward option" }, { status: 500 });
  }
}
