import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";

type LoyaltyRewardType = "NONE" | "FIFTY_PERCENT" | "FREE";

function isSignatureHaircut(serviceName: string) {
  return serviceName.trim().toLowerCase() === "signature haircut";
}

function getLoyaltyRewardErrorMessage(rewardType: LoyaltyRewardType) {
  if (rewardType === "FREE") {
    return "The free service reward can only be applied to Signature Haircut. Please add Signature Haircut to this transaction to use this reward.";
  }

  if (rewardType === "FIFTY_PERCENT") {
    return "The 50% discount reward can only be applied to Signature Haircut. Please add Signature Haircut to this transaction to use this reward.";
  }

  return "";
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUser();

    if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        payment: true,
        appointments: true,
        items: {
          include: {
            service: true,
          },
        },
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
    const requestedLoyaltyRewardType: LoyaltyRewardType =
      body.loyaltyRewardType === "FIFTY_PERCENT" ||
      body.loyaltyRewardType === "FREE"
        ? body.loyaltyRewardType
        : "NONE";
    const signatureHaircutSubtotal = sale.items.reduce((sum, item) => {
      if (!isSignatureHaircut(item.service.name)) return sum;

      return sum + Number(item.subtotal || 0);
    }, 0);

    if (
      requestedLoyaltyRewardType !== "NONE" &&
      signatureHaircutSubtotal <= 0
    ) {
      return NextResponse.json(
        { error: getLoyaltyRewardErrorMessage(requestedLoyaltyRewardType) },
        { status: 400 }
      );
    }

    let discount = Math.min(
      Math.max(Number(body.discount ?? sale.discount ?? 0), 0),
      subtotal
    );

    const method =
      body.method === "GCASH" || body.method === "CASH"
        ? body.method
        : sale.payment.method;

    const loyaltyCard = sale.customer.loyaltyCards;

    let loyaltyRewardType: LoyaltyRewardType = "NONE";

    if (
      requestedLoyaltyRewardType === "FIFTY_PERCENT" &&
      loyaltyCard &&
      loyaltyCard.stars >= 5
    ) {
      loyaltyRewardType = "FIFTY_PERCENT";
    }

    if (
      requestedLoyaltyRewardType === "FREE" &&
      loyaltyCard &&
      loyaltyCard.stars >= 10
    ) {
      loyaltyRewardType = "FREE";
    }

    if (
      requestedLoyaltyRewardType === "FIFTY_PERCENT" &&
      loyaltyRewardType !== "FIFTY_PERCENT"
    ) {
      return NextResponse.json(
        { error: "Customer has already redeemed the 50% discount reward." },
        { status: 400 }
      );
    }

    if (
      requestedLoyaltyRewardType === "FREE" &&
      loyaltyRewardType !== "FREE"
    ) {
      return NextResponse.json(
        { error: "Customer is not eligible for the free service reward." },
        { status: 400 }
      );
    }

    if (loyaltyRewardType === "FIFTY_PERCENT") {
      discount = Math.round(signatureHaircutSubtotal * 0.5);
    }

    if (loyaltyRewardType === "FREE") {
      discount = signatureHaircutSubtotal;
    }

    const totalAmount = Math.max(subtotal - discount, 0);

    let updatedStars = loyaltyCard?.stars ?? 0;

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
        if (loyaltyRewardType === "FREE") {
          updatedStars = 1;
        } else {
          updatedStars = Math.min(loyaltyCard.stars + 1, 10);
        }

        await tx.loyaltyCard.update({
          where: {
            id: loyaltyCard.id,
          },
          data: {
            stars: updatedStars,
            status: "ACTIVE",
            fiveRewardRedeemed:
              loyaltyRewardType === "FREE"
                ? false
                : loyaltyRewardType === "FIFTY_PERCENT"
                ? true
                : loyaltyCard.fiveRewardRedeemed,
          },
        });

        await tx.loyaltyCardActivity.create({
          data: {
            customerId: sale.customerId,
            saleId: sale.id,
            appointmentId: sale.appointments[0]?.id || null,
            stickerNumber: updatedStars,
            rewardUsed: loyaltyRewardType,
            customerName: `${sale.customer.firstName} ${sale.customer.lastName}`,
            message:
              loyaltyRewardType === "FREE"
                ? "Free reward redeemed. Loyalty card reset to 1 sticker."
                : loyaltyRewardType === "FIFTY_PERCENT"
                ? `50% reward redeemed. Sticker ${updatedStars} recorded.`
                : `Sticker ${updatedStars} earned from ${sale.saleCode}.`,
          },
        });
      }
    });

    await logPaymentReceived(req, user, sale.saleCode);

    const customerName = `${sale.customer.firstName} ${sale.customer.lastName}`;

    if (loyaltyCard) {
      await logLoyaltyStickerEarned(
        req,
        user,
        customerName,
        updatedStars,
        sale.saleCode
      );

      if (loyaltyRewardType === "FIFTY_PERCENT") {
        await logLoyaltyRewardRedeemed(
          req,
          user,
          customerName,
          "50%",
          sale.saleCode
        );
      }

      if (loyaltyRewardType === "FREE") {
        await logLoyaltyRewardRedeemed(
          req,
          user,
          customerName,
          "100%",
          sale.saleCode
        );
      }
    }

    if (discount > 0) {
      await logDiscountApplied(req, user, sale.saleCode);
    }

    return NextResponse.json({
      success: true,
      message: "Payment confirmed successfully",
      saleId: sale.id,
      paymentId: sale.payment.id,
      discount,
      totalAmount,
      method,
      loyaltyRewardType,
      currentStars: updatedStars,
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