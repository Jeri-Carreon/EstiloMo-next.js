import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // AUTH CHECK
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["OWNER", "RECEPTIONIST"].includes(session.user.role)
    ) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // REQUEST BODY
    let {firstName, lastName, email, mobileNumber,} = 
      await req.json();

    firstName = (firstName ?? "").trim();
    lastName = (lastName ?? "").trim();
    email = (email ?? "").toLowerCase().trim() || null;
    mobileNumber = (mobileNumber ?? "").replace(/\D/g, "");

    // VALIDATION
    if (!firstName || !lastName || !mobileNumber) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (firstName.length > 50 || lastName.length > 50) {
      return NextResponse.json(
        { ok: false, error: "Name too long" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email && !emailRegex.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email format" },
        { status: 400 }
      );
    } 

    if (email && email.length > 100) {
      return NextResponse.json(
        { ok: false, error: "Email is too long" },
        { status: 400 }
      );
    }

    // PH mobile format validation
    const mobileRegex = /^09\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Mobile number must be valid and formatted like 09123456789',
        },
        { status: 400 }
      );
    }

    if (email) {
      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { ok: false, error: "Email already exists" },
          { status: 400 }
        );
      }
    }

    const customer = await db.$transaction(async (tx) => {

      // customerCode
      const customerCounter = await tx.counter.update({
        where: { id: "customerCode" },
        data: {
          value: { increment: 1 },
        },
      });

      const customerCode = String(customerCounter.value).padStart(3, "0");

      // Create customer
      const newCustomer = await tx.customer.create({
        data: {
          customerCode,
          firstName,
          lastName,
          mobileNumber,

          customerType: "CASUAL",
          ...(email ? { email } : {}),
        },
      });

      // Create loyalty card automatically
      await tx.loyaltyCard.create({
        data: {
          customerId: newCustomer.id,
        },
      });

      return newCustomer;
    });

    // ✅ SUCCESS
    return NextResponse.json({
      ok: true,
      message: "Customer created successfully",
      customer,
    });

  } catch (error) {
    console.error("Create customer error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create customer" },
      { status: 500 }
    );
  }
}