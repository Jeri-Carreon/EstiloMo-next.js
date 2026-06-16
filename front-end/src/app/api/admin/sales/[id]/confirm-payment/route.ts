import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.email ||
      !["OWNER", "RECEPTIONIST"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        payment: true,
        appointments: true,
        customer: {
          include: {
            loyaltyCards: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (!sale.payment) {
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    if (sale.payment.status === "PAID") {
      return NextResponse.json({
        success: true,
        message: "Payment already confirmed",
      });
    }

    const subtotal = Number(sale.subtotal || 0);

    const discount = Math.min(
      Math.max(Number(body.discount ?? sale.discount ?? 0), 0),
      subtotal
    );

    const totalAmount = Math.max(subtotal - discount, 0);

    const method =
      body.method === "GCASH" || body.method === "CASH"
        ? body.method
        : sale.payment.method;

    const loyaltyRewardType =
      body.loyaltyRewardType === "FREE" ||
      body.loyaltyRewardType === "FIFTY_PERCENT"
        ? body.loyaltyRewardType
        : "NONE";

    const loyaltyCard = sale.customer.loyaltyCards[0];

    if (
      loyaltyRewardType === "FIFTY_PERCENT" &&
      (!loyaltyCard || loyaltyCard.stars !== 5)
    ) {
      return NextResponse.json(
        {
          error:
            "50% discount can only be redeemed once after earning exactly 5 stickers.",
        },
        { status: 400 }
      );
    }

    if (
      loyaltyRewardType === "FREE" &&
      (!loyaltyCard || loyaltyCard.stars < 10)
    ) {
      return NextResponse.json(
        {
          error:
            "Free discount can only be redeemed once after earning at least 10 stickers.",
        },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: sale.payment!.id },
        data: {
          status: "PAID",
          amount: totalAmount,
          discount,
          method,
        },
      });

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: "PAID",
          discount,
          totalAmount,
        },
      });

      if (sale.appointments.length > 0) {
        await tx.appointment.updateMany({
          where: { saleId: sale.id },
          data: { status: "COMPLETED" },
        });
      }

      if (loyaltyCard) {
        let newStars = loyaltyCard.stars + 1;

        if (loyaltyRewardType === "FREE") {
          newStars = 1;
        } else {
          newStars = Math.min(newStars, 10);
        }

        await tx.loyaltyCard.update({
          where: { id: loyaltyCard.id },
          data: {
            stars: newStars,
            status: "ACTIVE",
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Payment confirmed successfully",
      saleId: sale.id,
      paymentId: sale.payment.id,
      discount,
      totalAmount,
      method,
      loyaltyRewardType,
    });
  } catch (error) {
    console.error("CONFIRM PAYMENT ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to confirm payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}