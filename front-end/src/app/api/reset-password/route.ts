import { db } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  const { token, password } = await req.json();

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.expires < new Date()) {
    return new Response("Invalid or expired token", { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.user.update({
    where: { email: resetToken.email },
    data: { password: hashedPassword },
  });

  await db.passwordResetToken.delete({
    where: { token },
  });

  return Response.json({ ok: true });
}