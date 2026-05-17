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

    firstName = (firstName ?? "").trim();
    lastName = (lastName ?? "").trim();
    email = (email ?? "").toLowerCase().trim();
    mobileNumber = (mobileNumber ?? "").replace(/\D/g, "");
    password = password ?? "";

    // ========================
    // VALIDATION (unchanged)
    // ========================
    if (!firstName || !lastName || !email || !password || !mobileNumber) {
      return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const allowedRoles = ["RECEPTIONIST", "BARBER"];

    if (!allowedRoles.includes(role)) {
      return Response.json({ ok: false, error: "Invalid role" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return Response.json({ ok: false, error: "Email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ========================
    // CREATE USER CODE
    // ========================
    const userCounter = await db.counter.update({
      where: { id: "userCode" },
      data: { value: { increment: 1 } },
    });

    const userCode = String(userCounter.value).padStart(3, "0");

    // ========================
    // CREATE USER
    // ========================
    const user = await db.user.create({
      data: {
        userCode,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        mobileNumber,
        role,
        emailVerified: true,
      },
    });

    // ========================
    // CREATE BARBER (NEW LOGIC)
    // ========================
    if (role === "BARBER") {
      const barberCounter = await db.counter.update({
        where: { id: "barberCode" },
        data: { value: { increment: 1 } },
      });

      const barberCode = String(barberCounter.value).padStart(3, "0");

      await db.barber.create({
        data: {
          barberCode,
          userId: user.id,
          firstName,
          lastName,
          mobileNumber,
          email,
        },
      });
    }

    // ========================
    // CREATE RECEPTIONIST (optional placeholder)
    // ========================
    if (role === "RECEPTIONIST") {
      // future receptionist table logic here
    }

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