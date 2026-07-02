import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/register-user";

export async function POST(req: NextRequest) {
  try {
    let { firstName, lastName, email, mobileNumber } = await req.json();

    firstName = (firstName ?? "").trim();
    lastName = (lastName ?? "").trim();
    email = (email ?? "").toLowerCase().trim();
    mobileNumber = (mobileNumber ?? "").replace(/\D/g, "");

    if (!firstName || !lastName || !email || !mobileNumber) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    if (firstName.length > 50 || lastName.length > 50) {
      return NextResponse.json({ ok: false, error: "Name too long" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email format" }, { status: 400 });
    }

    if (email.length > 100) {
      return NextResponse.json({ ok: false, error: "Email is too long" }, { status: 400 });
    }

    const mobileRegex = /^09\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return NextResponse.json(
        { ok: false, error: "Mobile number must be valid (09123456789 format)" },
        { status: 400 }
      );
    }

    const { user, customer } = await registerUser({
      firstName,
      lastName,
      email,
      mobileNumber,
    });

    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      ok: true,
      message: "Customer created successfully",
      user: safeUser,
      customer,
    });
  } catch (error: any) {
    console.error("create-customer error:", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to create customer" },
      { status: 400 }
    );
  }
}