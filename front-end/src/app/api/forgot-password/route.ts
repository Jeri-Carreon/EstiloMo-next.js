import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  const { email } = await req.json();

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return Response.json({ ok: true }); // don't leak info

  const token = crypto.randomBytes(32).toString("hex");

  await db.passwordResetToken.create({
    data: {
      email,
      token,
      expires: new Date(Date.now() + 1000 * 60 * 15), // 15 mins
    },
  });

  // TODO: send email with link
  console.log(`Reset link: http://localhost:3000/reset-password?token=${token}`);

  return Response.json({ ok: true });
}