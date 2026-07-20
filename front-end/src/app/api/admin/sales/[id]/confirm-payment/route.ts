import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  logDiscountApplied,
  logLoyaltyRewardRedeemed,
  logLoyaltyStickerEarned,
  logPaymentReceived,
} from "@/lib/securityLogEvents";
import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";

type LoyaltyRewardType = "NONE" | "FIFTY_PERCENT" | "FREE";

function resolveSpecialDiscountType(value: unknown, legacyPwdDiscount?: boolean) {
  if (value === "PWD" || value === "SENIOR") return value;
  return legacyPwdDiscount ? "PWD" : null;
}

function isSignatureHaircut(serviceName: string) {
  return serviceName.trim().toLowerCase() === "signature haircut";
}

function calculatePwdPricing(subtotal: number) {
  const vatAmount = Math.round(subtotal * 0.12 * 100) / 100;
  const vatExemptBase = Math.round((subtotal - vatAmount) * 100) / 100;
  const pwdDiscountAmount = Math.round(vatExemptBase * 0.2 * 100) / 100;
  const fullTotalAmount = Math.max(
    Math.round((vatExemptBase - pwdDiscountAmount) * 100) / 100,
    0
  );

  return {
    vatAmount,
    discount: Math.round((subtotal - fullTotalAmount) * 100) / 100,
    fullTotalAmount,
  };
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
    const auth = await requireAdminTabAccess("sales", req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const user = auth.user;

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
      // Payment is already recorded as PAID. Ensure sale and appointments
      // are also updated so the admin UI reflects the confirmed state.
      try {
        await db.$transaction(async (tx) => {
          await tx.sale.update({
            where: { id: sale.id },
            data: { status: "PAID" },
          });

          if (sale.appointments.length > 0) {
            await tx.appointment.updateMany({
              where: { saleId: sale.id },
              data: { status: "COMPLETED" },
            });
          }
        });
      } catch (err) {
        console.error("SYNC PAID STATE ERROR:", err);
        // Fallthrough to return success message — we don't want to treat
        // this as a hard failure for the admin confirm flow.
      }

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
    const resolvedSpecialDiscountType = resolveSpecialDiscountType(
      body.specialDiscountType,
      body.pwdDiscount === true
    );
    const usePwdDiscount = Boolean(resolvedSpecialDiscountType);
    const normalizedPwdId = typeof body.pwdId === "string" ? body.pwdId.trim() : "";

    if (usePwdDiscount && !normalizedPwdId) {
      return NextResponse.json(
        { error: "PWD/Senior Citizen ID is required" },
        { status: 400 }
      );
    }

    const signatureHaircutSubtotal = sale.items.reduce((sum, item) => {
      if (!isSignatureHaircut(item.service.name)) return sum;

      return sum + Number(item.subtotal || 0);
    }, 0);

    if (
      !usePwdDiscount &&
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

    const loyaltyCard = sale.customer.loyaltyCards ?? null;
    const loyaltySettings = await db.loyaltyCardSetting.findFirst({
      select: {
        stickersPerTransaction: true,
      },
    });
    const fiftyPercentStickerThreshold = 5;
    const freeStickerThreshold = 10;
    const stickersPerTransaction = loyaltySettings?.stickersPerTransaction ?? 1;

    let loyaltyRewardType: LoyaltyRewardType = "NONE";

    if (
      !usePwdDiscount &&
      requestedLoyaltyRewardType === "FIFTY_PERCENT" &&
      loyaltyCard &&
      loyaltyCard.stars >= fiftyPercentStickerThreshold &&
      loyaltyCard.stars < freeStickerThreshold &&
      !loyaltyCard.fiveRewardRedeemed
    ) {
      loyaltyRewardType = "FIFTY_PERCENT";
    }

    if (
      !usePwdDiscount &&
      requestedLoyaltyRewardType === "FREE" &&
      loyaltyCard &&
      loyaltyCard.stars >= freeStickerThreshold
    ) {
      loyaltyRewardType = "FREE";
    }

    if (
      !usePwdDiscount &&
      requestedLoyaltyRewardType === "FIFTY_PERCENT" &&
      loyaltyRewardType !== "FIFTY_PERCENT"
    ) {
      return NextResponse.json(
        { error: "Customer has already redeemed the 50% discount reward." },
        { status: 400 }
      );
    }

    if (
      !usePwdDiscount &&
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

    const pwdPricing = usePwdDiscount ? calculatePwdPricing(subtotal) : null;
    if (pwdPricing) {
      discount = pwdPricing.discount;
      loyaltyRewardType = "NONE";
    }

    const vatAmount =
      pwdPricing?.vatAmount ??
      Math.round(subtotal * 0.12 * 100) / 100;
    const fullTotalAmount = pwdPricing?.fullTotalAmount ?? Math.max(subtotal - discount, 0);
    const downPayment = Number(sale.payment.downPayment || 0);
    const totalAmount =
      sale.source === "BOOKING"
        ? Math.max(fullTotalAmount - downPayment, 0)
        : fullTotalAmount;

    let updatedStars = loyaltyCard?.stars ?? 0;

    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: sale.payment!.id },
        data: {
          status: "PAID",
          amount: totalAmount,
          discount,
          pwdDiscount: usePwdDiscount,
          pwdId: usePwdDiscount ? normalizedPwdId : null,
          specialDiscountType: resolvedSpecialDiscountType,
          vatExempt: usePwdDiscount,
          vatAmount,
          method,
          gcashRefNo: method === "GCASH" ? body.gcashRefNo : null,
        },
      });

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: "PAID",
          discount,
          pwdDiscount: usePwdDiscount,
          pwdId: usePwdDiscount ? normalizedPwdId : null,
          specialDiscountType: resolvedSpecialDiscountType,
          vatExempt: usePwdDiscount,
          vatAmount,
          totalAmount: fullTotalAmount,
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
          updatedStars = Math.min(
            loyaltyCard.stars + stickersPerTransaction,
            freeStickerThreshold
          );
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
