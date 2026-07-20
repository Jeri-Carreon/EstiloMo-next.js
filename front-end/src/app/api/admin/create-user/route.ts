import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logUserCreated } from "@/lib/securityLogEvents";
import {
  adminAuthorizationResponse,
  requireOwner,
} from "@/lib/adminAuthorization";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase configuration");
  }

  return createAdminClient(url, key);
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    const auth = await requireOwner(req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const user = auth.user;

    // REQUEST BODY
    let { firstName, lastName, email, password, mobileNumber, role } =
      await req.json();
    
    console.log("REQUEST BODY:", { firstName, lastName, email, mobileNumber, role, password: !!password });

    // SANITIZE
    firstName = (firstName ?? "").trim();
    lastName = (lastName ?? "").trim();
    email = (email ?? "").toLowerCase().trim();
    mobileNumber = (mobileNumber ?? "").replace(/\D/g, "");
    password = password ?? "";

    const e164Phone = mobileNumber.replace(/^0/, "+63");

    // REQUIRED FIELDS
    if (!firstName || !lastName || !email || !password || !mobileNumber) {
      return NextResponse.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    // NAME VALIDATION
    if (firstName.length > 50 || lastName.length > 50) {
      return NextResponse.json(
        { ok: false, error: "Name too long" },
        { status: 400 }
      );
    }

    // EMAIL VALIDATION
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email format" },
        { status: 400 }
      );
    }
    if (email.length > 100) {
      return NextResponse.json(
        { ok: false, error: "Email too long" },
        { status: 400 }
      );
    }

    // MOBILE VALIDATION
    const mobileRegex = /^09\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mobile number must be valid and formatted like 09123456789",
        },
        { status: 400 }
      );
    }

    // PASSWORD VALIDATION
    if (password.length > 72) {
      return NextResponse.json(
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
      return NextResponse.json(
        { ok: false, error: "Weak password" },
        { status: 400 }
      );
    }

    role = (role ?? "").trim();

    // ROLE VALIDATION
    const allowedRoles = await db.$queryRaw<{ role: string }[]>`
      SELECT "role"
      FROM "AdminStaffRole"
      WHERE "role" <> 'OWNER'
        AND "isActive" = true
    `;
    if (!allowedRoles.some((staffRole) => staffRole.role === role)) {
      return NextResponse.json(
        { ok: false, error: "Invalid role" },
        { status: 400 }
      );
    }


    // CHECK EXISTING EMAIL
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "Email already exists" },
        { status: 400 }
      );
    }

    // CHECK EXISTING MOBILE NUMBER
    const existingMobile = await db.user.findFirst({ where: { mobileNumber } });
    if (existingMobile) {
      return NextResponse.json(
        { ok: false, error: "Mobile number already exists" },
        { status: 400 }
      );
    }

    // CREATE SUPABASE AUTH USER
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        phone: e164Phone,
        email_confirm: true,
        user_metadata: {
          full_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          skip_trigger: "true",
        },
      });

    if (authError) {
      return NextResponse.json(
        { ok: false, error: authError.message },
        { status: 400 }
      );
    }

    const supabaseUserId = authData.user.id;

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db
      .$transaction(async (tx) => {
        // CHECK IF ID ALREADY EXISTS (orphaned from previous failed attempt)
        // CHECK IF ID ALREADY EXISTS (orphaned from previous failed attempt)
        const existingId = await tx.user.findUnique({
          where: { id: supabaseUserId },
        });
        console.log("supabaseUserId:", supabaseUserId);
        console.log("existingId:", existingId);
        if (existingId) {
          throw new Error("USER_ID_CONFLICT");
        }

        // GENERATE USER CODE
        const userCounter = await tx.counter.update({
          where: { id: "userCode" },
          data: { value: { increment: 1 } },
        });

        const userCode = `USR-${String(userCounter.value).padStart(3, "0")}`;

        // CREATE USER
        const newUser = await tx.user.create({
          data: {
            id: supabaseUserId,
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

        // CREATE BARBER IF ROLE IS BARBER
        if (role === "BARBER") {
          const barberCounter = await tx.counter.update({
            where: { id: "barberCode" },
            data: { value: { increment: 1 } },
          });

          const barberCode = `BRB-${String(barberCounter.value).padStart(3,"0")}`;

          await tx.barber.create({
            data: {
              barberCode,
              userId: newUser.id,
              firstName,
              lastName,
              mobileNumber,
              email,
            },
          });
        }

        return newUser;
      })
      .catch(async (err) => {
        // ROLLBACK: delete Supabase auth user if DB transaction fails
        await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);

        if (err.message === "USER_ID_CONFLICT") {
          throw new Error("User already exists in the database");
        }

        throw err;
      });

    await logUserCreated(req, user, `${result.firstName} ${result.lastName}`.trim());

    return NextResponse.json({
      ok: true,
      message: "User created successfully",
      user: result,
    });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
