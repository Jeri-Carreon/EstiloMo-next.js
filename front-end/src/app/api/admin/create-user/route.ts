import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 🔐 AUTH CHECK
    if (!session || session.user.role !== "OWNER") {
      return Response.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    let { firstName, lastName, email, password, mobileNumber, role } =
      await req.json();

    firstName = firstName.trim();
    lastName = lastName.trim();
    email = email.toLowerCase().trim();
    mobileNumber = mobileNumber.trim();

    if (!firstName || !lastName || !email || !password || !mobileNumber) {
      return Response.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const mobileRegex = /^09\d{9}$/;

    if (!mobileRegex.test(mobileNumber)) {
      return Response.json(
        {
          ok: false,
          error:
            'Mobile number must be valid and formatted like 09123456789',
        },
        { status: 400 }
      );
    }

    // 🔒 only allow staff roles
    const allowedRoles = ["RECEPTIONIST", "BARBER"];

    if (!allowedRoles.includes(role)) {
      return Response.json(
        { ok: false, error: "Invalid role" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return Response.json(
        { ok: false, error: "Email already exists" },
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
        role,
        emailVerified: true, // admin-created accounts skip verification
      },
    });

    return Response.json({
      ok: true,
      message: "User created",
      user,
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}