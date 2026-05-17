import bcrypt from "bcrypt";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  try {
    let { firstName, lastName, email, password, mobileNumber } =
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

    // ========================
    // CHECK EXISTING USER
    // ========================
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "Email already registered" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ========================
    // TRANSACTION (IMPORTANT FIX)
    // ========================
    const user = await db.$transaction(async (tx) => {

      // UserCode 
      const userCounter = await tx.counter.update({
        where: { id: "userCode" },
        data: {
          value: { increment: 1 },
        },
      });

    const userCode = String(userCounter.value).padStart(3, "0");
      const newUser = await tx.user.create({
        data: {
          userCode,
          firstName,
          lastName,
          email,
          password: hashedPassword,
          mobileNumber,
          role: "CUSTOMER",
          emailVerified: false,
        },
      });

      // customerCode
      const customerCounter = await tx.counter.update({
        where: { id: "customerCode" },
        data: {
          value: { increment: 1 },
        },
      });

      const customerCode = String(customerCounter.value).padStart(3, "0");

      await tx.customer.create({
        data: {
          userId: newUser.id,
          customerCode, 
          mobileNumber,
          customerType: "CASUAL",
        },
      });

      return newUser;
    });

    // ========================
    // EMAIL VERIFICATION TOKEN
    // ========================
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await db.verificationToken.create({
      data: {
        email,
        token: hashedToken,
        expires: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    const verifyLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${rawToken}`;

    // ========================
    // SEND EMAIL
    // ========================
    await resend.emails.send({
      from: "The Barbs Bro Support <onboarding@resend.dev>",
      to: email,
      subject: "Verify your email",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Welcome to The Barbs Bro</h2>
          <p>Hi ${firstName},</p>
          <p>Click below to verify your email:</p>
          <p>${verifyLink}</p>
          <p>This link expires in 30 minutes.</p>
        </div>
      `,
    });

    // ========================
    // RESPONSE (match admin style)
    // ========================
    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      ok: true,
      message: "Verification email sent",
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