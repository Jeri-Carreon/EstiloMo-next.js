import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminAuthorizationResponse, requireAdminTabAccess } from "@/lib/adminAuthorization";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminTabAccess("loyaltyCard", req);
    if (auth.status !== 200) return adminAuthorizationResponse(auth.status);

    const { id } = await context.params;
    const body = await req.json();
    const action = body.action;
    const amount = Number(body.amount);
    if ((action !== "ADD" && action !== "REMOVE") || !Number.isInteger(amount) || amount < 1) {
      return NextResponse.json({ error: "Invalid sticker adjustment." }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const [card, settings] = await Promise.all([
        tx.loyaltyCard.findUnique({ where: { id }, include: { customer: true } }),
        tx.loyaltyCardSetting.findFirst({ select: { freeStickerThreshold: true } }),
      ]);
      if (!card) throw new Error("NOT_FOUND");

      const maximum = settings?.freeStickerThreshold ?? 10;
      const nextStars = action === "ADD" ? card.stars + amount : card.stars - amount;
      if (nextStars < 0 || nextStars > maximum) throw new Error("OUT_OF_RANGE");

      const updatedCard = await tx.loyaltyCard.update({
        where: { id }, data: { stars: nextStars }, include: { customer: true },
      });
      const customerName = `${updatedCard.customer.firstName ?? ""} ${updatedCard.customer.lastName ?? ""}`.trim() || "Customer";
      const activity = await tx.loyaltyCardActivity.create({
        data: {
          customerId: updatedCard.customerId,
          customerName,
          stickerNumber: nextStars,
          type: action === "ADD" ? "EARNED" : "ADJUSTED",
          message: `${amount} sticker${amount === 1 ? "" : "s"} manually ${action === "ADD" ? "added" : "removed"}.`,
        },
      });
      return { card: updatedCard, maximum, activity };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ error: "Loyalty card not found" }, { status: 404 });
    if (error instanceof Error && error.message === "OUT_OF_RANGE") return NextResponse.json({ error: "Sticker adjustment is outside the allowed range." }, { status: 400 });
    console.error("Loyalty sticker adjustment error:", error);
    return NextResponse.json({ error: "Failed to adjust stickers" }, { status: 500 });
  }
}
