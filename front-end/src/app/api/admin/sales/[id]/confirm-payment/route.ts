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
            loyaltyCards: true,
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

    const loyaltyCard = sale.customer.loyaltyCards;

    let loyaltyRewardType: "NONE" | "FIFTY_PERCENT" | "FREE" = "NONE";

    if (
      body.loyaltyRewardType === "FIFTY_PERCENT" &&
      loyaltyCard &&
      loyaltyCard.stars === 5
    ) {
      loyaltyRewardType = "FIFTY_PERCENT";
    }

    if (
      body.loyaltyRewardType === "FREE" &&
      loyaltyCard &&
      loyaltyCard.stars >= 10
    ) {
      loyaltyRewardType = "FREE";
    }

    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: sale.payment!.id },
        data: {
          status: "PAID",
          amount: totalAmount,
          discount,
          method,
          gcashRefNo: method === "GCASH" ? body.gcashRefNo : null,
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
          data: {
            status: "COMPLETED",
          },
        });
      }

      if (loyaltyCard) {
        let newStars = loyaltyCard.stars;

        if (loyaltyRewardType === "FREE") {
          newStars = 1;
        } else {
          newStars = Math.min(loyaltyCard.stars + 1, 10);
        }

        await tx.loyaltyCard.update({
          where: {
            id: loyaltyCard.id,
          },
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
      currentStars: loyaltyCard?.stars ?? 0,
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