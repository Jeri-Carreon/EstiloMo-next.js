import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type ResolvedPaymentState = "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";

function normalizeState(value: string | null): ResolvedPaymentState | null {
  const state = (value || "").toLowerCase();

  if (["paid", "success", "succeeded", "complete", "completed"].includes(state)) {
    return "PAID";
  }

  if (["expired", "expire"].includes(state)) {
    return "EXPIRED";
  }

  if (["cancelled", "canceled", "cancel"].includes(state)) {
    return "CANCELLED";
  }

  if (["failed", "fail", "rejected", "declined"].includes(state)) {
    return "FAILED";
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const state = normalizeState(req.nextUrl.searchParams.get("status"));

    const saleId = req.nextUrl.searchParams.get("saleId");
    const saleCode = req.nextUrl.searchParams.get("saleCode");
    const paymentId = req.nextUrl.searchParams.get("paymentId");

    const hasPaymentReference = Boolean(saleId || saleCode || paymentId);

    if (state && hasPaymentReference) {
      const payment = await db.payment.findFirst({
        where: {
          OR: [
            ...(paymentId ? [{ id: paymentId }] : []),
            ...(saleId ? [{ saleId }] : []),
          ],
        },
        include: {
          sale: true,
        },
      });

      if (!payment) {
        return NextResponse.redirect(
          new URL("/appointment?paymentStatus=not_found", req.nextUrl.origin)
        );
      }

      await db.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: state === "PAID" ? "PAID" : "REJECTED",
          },
        });

        if (payment.saleId) {
          await tx.sale.update({
            where: { id: payment.saleId },
            data: {
              status: state === "PAID" ? "PARTIAL" : "CANCELLED",
              downPaymentStatus: state,
              ...(state !== "PAID"
                ? { cancelReason: `PayMongo payment ${state.toLowerCase()}` }
                : {}),
            },
          });

          await tx.appointment.updateMany({
            where: {
              saleId: payment.saleId,
              status: "PENDING",
            },
            data: {
              status: state === "PAID" ? "SCHEDULED" : "CANCELLED",
            },
          });
        }
      });

      const redirectPath =
        state === "PAID"
          ? `/myAppointments?payment=success&saleId=${encodeURIComponent(
              payment.saleId || saleId || ""
            )}`
          : `/appointment?payment=${state.toLowerCase()}&saleId=${encodeURIComponent(
              payment.saleId || saleId || ""
            )}`;

      return NextResponse.redirect(new URL(redirectPath, req.nextUrl.origin));
    }

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!saleId && !saleCode) {
      return NextResponse.json(
        { error: "Missing sale reference" },
        { status: 400 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { email: authUser.email },
      include: { customer: true },
    });

    if (!dbUser?.customer) {
      return NextResponse.json(
        { error: "Customer profile not found" },
        { status: 404 }
      );
    }

    const sale = await db.sale.findFirst({
      where: {
        ...(saleId ? { id: saleId } : { saleCode: saleCode! }),
        customerId: dbUser.customer.id,
      },
      include: {
        payment: true,
        appointments: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const isScheduled =
      sale.appointments.length > 0 &&
      sale.appointments.every(
        (appointment) => appointment.status === "SCHEDULED"
      );

    return NextResponse.json({
      saleId: sale.id,
      saleCode: sale.saleCode,
      saleStatus: sale.status,
      paymentStatus: sale.payment?.status || "PENDING",
      downPaymentStatus: sale.downPaymentStatus,
      downPayment: Number(sale.payment?.downPayment || 0),
      appointmentStatuses: sale.appointments.map(
        (appointment) => appointment.status
      ),
      isScheduled,
    });
  } catch (error) {
    console.error("PAYMENT STATUS ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to check payment status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}