import bcrypt from "bcrypt"; //used for hashing passwords before storing them in the database
import { db } from "@/lib/db"; //used for database operations, allows use of db.user.create

{/*This function runs when a POST request is sent to /api/register */}
export async function POST(req: Request) { 
  const { firstName, lastName, email, password, mobileNumber } = await req.json();

  const hashedPassword = await bcrypt.hash(password, 10); //hashes password, 10 = number of salt rounds, higher is more secure but slower

  const user = await db.user.create({ //this saves the user to the database using Prisma create method
    data: {
      firstName,
      lastName,
      password: hashedPassword,
      email,
      mobileNumber,
      role: "customer"
    },
  });

  return Response.json({ user });
}