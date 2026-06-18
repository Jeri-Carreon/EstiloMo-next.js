import { db } from "@/lib/db";
import crypto from "crypto";

//Email API (Resend)
import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return new Resend(apiKey);
}

export async function POST(req: Request) {
  const { email } = await req.json();

  const user = await db.user.findUnique({ where: { email } });

  if (!user) { // To not reveal if account exists
    return Response.json({ ok: true });
  }

  // Generates Token
  const token = crypto.randomBytes(32).toString("hex");

  await db.passwordResetToken.create({
    data: {
      email,
      token,
      expires: new Date(Date.now() + 1000 * 60 * 15), // 15 mins
    },
  });

  // TODO: send email with link
  const resetLink = `http://localhost:3000/reset-password?token=${token}`;

  await getResendClient().emails.send({
    from: "The Barbs Bro Support <onboarding@resend.dev>",
    to: email,
    subject: "Reset Your Password",

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset</h2>

        <p>Hi ${user.firstName},</p>

        <p>
          You have requested a password reset.
          Click the link below to reset your password:
        </p>

        <p> ${resetLink} </p>

        <p style="margin-top: 20px;">
          If you didn't make this request, you can ignore this email.
        </p>

        <p>
          This link will expire in 15 minutes.
        </p>
      </div>
    `,
  });
  
  return Response.json({ ok: true });
}
