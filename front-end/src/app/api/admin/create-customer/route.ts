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
    let {
      firstName,
      lastName,
      email,
      mobileNumber,
    } = await req.json();

    firstName = firstName?.trim();
    lastName = lastName?.trim();
    email = email?.trim().toLowerCase() || null;
    mobileNumber = mobileNumber?.trim();

    // VALIDATION
    if (!firstName || !lastName || !mobileNumber) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TRANSACTION
    const customer = await db.$transaction(async (tx) => {

      // Create customer
      const newCustomer = await tx.customer.create({
        data: {
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