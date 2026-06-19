import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const customer = await db.customer.findUnique({
      where: {
        email: session.user.email,
      },
      include: {
        loyaltyCards: true,
        appointments: {
          where: {
            status: "COMPLETED",
          },
          orderBy: {
            appointmentDate: "asc",
          },
          include: {
            barber: true,
            service: true,
            payment: true,
          },
          take: 10,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    let loyaltyCard = customer.loyaltyCards;

    if (!loyaltyCard) {
      loyaltyCard = await db.loyaltyCard.create({
        data: {
          customerId: customer.id,
          stars: 0,
          status: "ACTIVE",
        },
      });
    }

    const customerName = `${customer.firstName} ${customer.lastName}`;

    return NextResponse.json({
      customer: {
        id: customer.id,
        customerCode: customer.customerCode,
        firstName: customer.firstName,
        lastName: customer.lastName,
        name: customerName,
        email: customer.email,
        mobileNumber: customer.mobileNumber,
      },

      loyaltyCard: {
        id: loyaltyCard.id,
        customerId: customer.id,
        customerCode: customer.customerCode,
        customerName,
        stars: Math.min(loyaltyCard.stars, 10),
        status: loyaltyCard.status,
      },

      appointments: customer.appointments,
    });
  } catch (error) {
    console.error("Loyalty card error:", error);

    return NextResponse.json(
      { error: "Failed to load loyalty card" },
      { status: 500 }
    );
  }
}