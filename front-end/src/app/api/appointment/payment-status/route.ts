import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const FAILURE_PAYMENT_PARAMS = new Set(["failed", "expired", "cancel"]);

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const saleId = req.nextUrl.searchParams.get("saleId");
    const saleCode = req.nextUrl.searchParams.get("saleCode");
    const paymentParam = req.nextUrl.searchParams.get("payment");
    const confirmReturn =
      req.nextUrl.searchParams.get("confirmReturn") === "1";

    if (!saleId && !saleCode) {
      return NextResponse.json(
        { error: "Missing sale reference" },
        { status: 400 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: {
        email: authUser.email,
      },
      include: {
        customer: true,
      },
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

    if (paymentParam && FAILURE_PAYMENT_PARAMS.has(paymentParam)) {
      const downPaymentStatus =
        paymentParam === "expired" ? "EXPIRED" : "FAILED";

      await db.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: {
            saleId: sale.id,
            status: "PENDING",
          },
          data: {
            status: "REJECTED",
          },
        });

        await tx.sale.update({
          where: {
            id: sale.id,
          },
          data: {
            status: "CANCELLED",
            downPaymentStatus,
          },
        });

        await tx.appointment.updateMany({
          where: {
            saleId: sale.id,
            status: "PENDING",
          },
          data: {
            status: "CANCELLED",
          },
        });
      });
    }

    if (confirmReturn && sale.appointments.length > 0) {
      await db.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: {
            saleId: sale.id,
          },
          data: {
            status: "PENDING",
            downPayment: 150,
          },
        });

        await tx.sale.update({
          where: {
            id: sale.id,
          },
          data: {
            status: "PENDING",
          },
        });

        await tx.appointment.updateMany({
          where: {
            saleId: sale.id,
            status: "PENDING",
          },
          data: {
            status: "SCHEDULED",
          },
        });
      });
    }

    const refreshedSale = await db.sale.findUnique({
      where: {
        id: sale.id,
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

    if (!refreshedSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const isScheduled =
      refreshedSale.appointments.length > 0 &&
      refreshedSale.appointments.every(
        (appointment) => appointment.status === "SCHEDULED"
      );

    return NextResponse.json({
      saleId: refreshedSale.id,
      saleCode: refreshedSale.saleCode,
      saleStatus: refreshedSale.status,
      downPaymentStatus: refreshedSale.downPaymentStatus,
      paymentStatus: refreshedSale.payment?.status || "PENDING",
      downPayment: Number(refreshedSale.payment?.downPayment || 0),
      appointmentStatuses: refreshedSale.appointments.map(
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