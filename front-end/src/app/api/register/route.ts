import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "@/lib/db";
import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return new Resend(apiKey);
}

export async function POST(req: Request) {
  try {
    let { firstName, lastName, email, password, mobileNumber } =
      await req.json();

    if (!firstName || !lastName || !email || !password || !mobileNumber) {
      return Response.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    firstName = firstName.trim();
    lastName = lastName.trim();
    email = email.toLowerCase().trim();
    mobileNumber = mobileNumber.trim();

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return Response.json(
        { ok: false, error: "Email already registered" },
        { status: 400 }
      );
    }

    // Password Strength
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
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

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await db.verificationToken.create({
      data: {
        email,
        token: hashedToken,
        expires: new Date(Date.now() + 1000 * 60 * 30), // 30 mins
      },
    });

    // Creates verification link
    const verifyLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${rawToken}`;

    await getResendClient().emails.send({
      from: "The Barbs Bro Support <onboarding@resend.dev>",
      to: email,
      subject: "Verify your email",

      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to The Barbs Bro</h2>

        <p>Hi ${user.firstName},</p>

        <p>Please verify your email by clicking the link below:</p>

        <p> ${verifyLink} </p>

        <p>
          This link will expire in 30 minutes.
        </p>
      </div>
    `,
    });

    const { password: _, ...safeUser } = user;

    return Response.json({ok: true, message: "Verification email sent", user: safeUser,});
  } catch (error) {
    console.error("Registration error:", error);

    return Response.json(
      { ok: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}
