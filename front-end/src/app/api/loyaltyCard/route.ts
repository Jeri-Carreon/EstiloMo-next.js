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
        loyaltyCards: {
          where: {
            status: "ACTIVE",
          },
          take: 1,
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

    if (!loyaltyCard) {
      loyaltyCard = await db.loyaltyCard.create({
        data: {
          customerId: customer.id,
          stars: 0,
          status: "ACTIVE",
        },
      });
    }

    return NextResponse.json({
      customer,
      loyaltyCard,
    });
  } catch (error) {
    console.error("Loyalty card error:", error);

    return NextResponse.json(
      { error: "Failed to load loyalty card" },
      { status: 500 }
    );
  }
}