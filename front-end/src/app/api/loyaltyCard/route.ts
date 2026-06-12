import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await db.customer.findUnique({
      where: {
        email: session.user.email,
      },
      include: {
        loyaltyCards: {
          where: {
            status: "ACTIVE",
          },
          take: 1,
        },
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

    let loyaltyCard = customer.loyaltyCards[0];

    const completedCount = customer.appointments.length;

    if (!loyaltyCard) {
      loyaltyCard = await db.loyaltyCard.create({
        data: {
          customerId: customer.id,
          stars: Math.min(completedCount, 10),
          status: completedCount >= 10 ? "COMPLETED" : "ACTIVE",
        },
      });
    }

    return NextResponse.json({
      customer,
      loyaltyCard: {
        ...loyaltyCard,
        stars: Math.min(loyaltyCard.stars, 10),
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