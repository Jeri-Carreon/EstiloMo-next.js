import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // AUTH CHECK
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "OWNER") {
      return Response.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // REQUEST BODY
    let {
      firstName,
      lastName,
      email,
      password,
      mobileNumber,
      role,
    } = await req.json();

    // SANITIZE
    firstName = (firstName ?? "").trim();
    lastName = (lastName ?? "").trim();
    email = (email ?? "").toLowerCase().trim();
    mobileNumber = (mobileNumber ?? "").replace(/\D/g, "");
    password = password ?? "";

    // ========================
    // VALIDATION (unchanged)
    // ========================
    // REQUIRED FIELDS
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !mobileNumber
    ) {
      return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // NAME VALIDATION
    if (firstName.length > 50 || lastName.length > 50) {
      return Response.json(
        { ok: false, error: "Name too long" },
        { status: 400 }
      );
    }

    // EMAIL VALIDATION
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return Response.json(
        { ok: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (email.length > 100) {
      return Response.json(
        { ok: false, error: "Email too long" },
        { status: 400 }
      );
    }

    // MOBILE VALIDATION
    const mobileRegex = /^09\d{9}$/;

    if (!mobileRegex.test(mobileNumber)) {
      return Response.json(
        {
          ok: false,
          error:
            "Mobile number must be valid and formatted like 09123456789",
        },
        { status: 400 }
      );
    }

    // PASSWORD VALIDATION
    if (password.length > 72) {
      return Response.json(
        { ok: false, error: "Password too long" },
        { status: 400 }
      );
    }

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

    // ROLE VALIDATION
    const allowedRoles = ["RECEPTIONIST", "BARBER"];

    if (!allowedRoles.includes(role)) {
      return Response.json({ ok: false, error: "Invalid role" }, { status: 400 });
    }

    // CHECK EXISTING EMAIL
    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return Response.json({ ok: false, error: "Email already exists" }, { status: 400 });
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // GENERATE USER CODE
    const userCounter = await db.counter.update({
      where: {
        id: "userCode",
      },
      data: {
        value: {
          increment: 1,
        },
      },
    });

    const userCode = `USR-${String(userCounter.value).padStart(3, "0")}`;

    // CREATE USER
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

        userCode,
        firstName,
        lastName,

        email,

        password: hashedPassword,

        mobileNumber,

        role,

        isActive: true,

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
      message: "User created successfully",
      user,
    });

  } catch (error) {
    console.error("CREATE USER ERROR:", error);

    return Response.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}