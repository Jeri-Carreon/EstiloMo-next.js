import bcrypt from "bcrypt";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      role: "customer"
    },
  });

  return Response.json({ user });
}