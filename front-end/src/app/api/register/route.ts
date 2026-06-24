import { NextResponse } from "next/server";
import { registerUser } from "@/lib/register-user";

export async function POST(req: Request) {
  try {
    let { firstName, lastName, email, password, mobileNumber, id } =
      await req.json();

    firstName = (firstName ?? "").trim();
    lastName = (lastName ?? "").trim();
    email = (email ?? "").toLowerCase().trim();
    mobileNumber = (mobileNumber ?? "").replace(/\D/g, "");
    password = password ?? "";

    // ========================
    // VALIDATION
    // ========================
    if (!firstName || !lastName || !email || !password || !mobileNumber) {
      return NextResponse.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    if (firstName.length > 50 || lastName.length > 50) {
      return NextResponse.json(
        { ok: false, error: "Name too long" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email format" },
        { status: 400 }
      );
    } 

    if (email.length > 100) {
      return NextResponse.json(
        { ok: false, error: "Email is too long" },
        { status: 400 }
      );
    }

    // PH mobile format validation
    const mobileRegex = /^09\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mobile number must be valid (09123456789 format)",
        },
        { status: 400 }
      );
    }

    if (password.length > 72) {
      return NextResponse.json(
        { ok: false, error: "Password too long" }, 
        { status: 400 });
    }
    
    // Password strength
    const strongPassword =
      password.length >= 8 &&
      /[a-zA-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!strongPassword) {
      return NextResponse.json(
        { ok: false, error: "Weak password" },
        { status: 400 }
      );
    }

    const { user } = await registerUser({
      id,
      firstName,
      lastName,
      email,
      password,
      mobileNumber,
    });

    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      ok: true,
      message: "Account created successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      { ok: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}
