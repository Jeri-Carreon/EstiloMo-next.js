import bcrypt from "bcrypt";
import crypto from "crypto";
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
    mobileNumber = (mobileNumber ?? "").trim();
    password = password ?? "";

    // ========================
    // VALIDATION
    // ========================
    if (!firstName || !lastName || !email || !password || !mobileNumber) {
      return Response.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    // PH mobile format validation
    const mobileRegex = /^09\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return Response.json(
        {
          ok: false,
          error: "Mobile number must be valid (09123456789 format)",
        },
        { status: 400 }
      );
    }

    // Password strength
    const strongPassword =
      password.length >= 8 &&
      /[a-zA-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!strongPassword) {
      return Response.json(
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
      return Response.json(
        { ok: false, error: "Email already registered" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ========================
    // TRANSACTION (IMPORTANT FIX)
    // ========================
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          mobileNumber,
          role: "CUSTOMER",
          emailVerified: false,
        },
      });

      await tx.customer.create({
        data: {
          userId: newUser.id,
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

    return Response.json({
      ok: true,
      message: "Verification email sent",
      user: safeUser,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return Response.json(
      { ok: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}