import crypto from "crypto";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { token } = await req.json();

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const record = await db.verificationToken.findFirst({
    where: { token: hashedToken },
  });

  if (!record) {
    return Response.json({ ok: false, error: "Invalid token" }, { status: 400 });
  }

  if (record.expires < new Date()) {
    return Response.json({ ok: false, error: "Token expired" }, { status: 400 });
  }

  await db.user.update({
    where: { email: record.email },
    data: {
      emailVerified: true,
    },
  });

  await db.verificationToken.delete({
    where: { id: record.id },
  });

  return Response.json({ ok: true, message: "Email verified" });
}