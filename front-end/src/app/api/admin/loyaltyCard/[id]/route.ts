import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getAdminUser } from "@/lib/supabase/getUser";

export async function PUT(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const user = await getAdminUser();

    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const status = body.status;

    if (!["ACTIVE", "COMPLETED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const card = await db.loyaltyCard.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            appointments: {
              where: { status: "COMPLETED" },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Loyalty card not found" }, { status: 404 });
    }

    const completedCount = card.customer.appointments.length;

    const updatedCard = await db.loyaltyCard.update({
      where: { id },
      data: {
        stars: Math.min(completedCount, 10),
        status,
      },
      include: {
        customer: true,
      },
    });

    await db.loyaltyCardActivity.create({
      data: {
        customerName: `${updatedCard.customer.firstName} ${updatedCard.customer.lastName}`,
        message: `Loyalty card status updated to ${status}`,
      },
    });

    return NextResponse.json({ card: updatedCard });
  } catch (error) {
    console.error("Update loyalty card error:", error);

    return NextResponse.json(
      { error: "Failed to update loyalty card" },
      { status: 500 }
    );
  }
}