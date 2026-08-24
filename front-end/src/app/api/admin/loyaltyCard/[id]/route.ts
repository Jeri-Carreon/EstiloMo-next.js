import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logLoyaltyCardStatusUpdated } from "@/lib/securityLogEvents";
import { adminAuthorizationResponse, requireAdminTabAccess } from "@/lib/adminAuthorization";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminTabAccess("loyaltyCard", req);
    if (auth.status !== 200) return adminAuthorizationResponse(auth.status);

    const { id } = await context.params;
    const body = await req.json();
    const status = body.status;
    const requestedStars = body.stars;
    if (!['ACTIVE', 'COMPLETED'].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (requestedStars !== undefined && (!Number.isInteger(requestedStars) || requestedStars < 0)) {
      return NextResponse.json({ error: "Invalid sticker count" }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const [card, settings] = await Promise.all([
        tx.loyaltyCard.findUnique({ where: { id }, include: { customer: true } }),
        tx.loyaltyCardSetting.findFirst({ select: { freeStickerThreshold: true } }),
      ]);
      if (!card) throw new Error("NOT_FOUND");

      const stars = requestedStars ?? card.stars;
      const maximum = settings?.freeStickerThreshold ?? 10;
      if (stars > maximum) throw new Error("OUT_OF_RANGE");
      const updatedCard = await tx.loyaltyCard.update({ where: { id }, data: { status, stars }, include: { customer: true } });
      const customerName = `${updatedCard.customer.firstName ?? ""} ${updatedCard.customer.lastName ?? ""}`.trim() || "Customer";
      const activities = [];

      if (stars !== card.stars) {
        const amount = Math.abs(stars - card.stars);
        activities.push(await tx.loyaltyCardActivity.create({ data: {
          customerId: updatedCard.customerId,
          customerName,
          stickerNumber: stars,
          type: stars > card.stars ? "EARNED" : "ADJUSTED",
          message: `${amount} sticker${amount === 1 ? "" : "s"} manually ${stars > card.stars ? "added" : "removed"}.`,
        }}));
      }

      if (status !== card.status) {
        activities.push(await tx.loyaltyCardActivity.create({ data: {
          customerId: updatedCard.customerId, customerName, type: "OTHER",
          message: `Loyalty card status updated to ${status}`,
        }}));
      }
      return { card: updatedCard, maximum, activities, statusChanged: status !== card.status, customerName };
    });

    if (result.statusChanged) await logLoyaltyCardStatusUpdated(req, auth.user, result.customerName, status);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ error: "Loyalty card not found" }, { status: 404 });
    if (error instanceof Error && error.message === "OUT_OF_RANGE") return NextResponse.json({ error: "Sticker count exceeds the allowed maximum." }, { status: 400 });
    console.error("Update loyalty card error:", error);
    return NextResponse.json({ error: "Failed to update loyalty card" }, { status: 500 });
  }
}
