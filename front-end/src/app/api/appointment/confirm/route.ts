import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

import { parsePHDateOnly, todayCodePH } from "@/lib/dateUtils";

const PAYMONGO_TEST_LINK =
  "https://pm.link/org-BA17dRCb7nm1wKHos2XqdoSo/test/gv92X8d";

async function createAppointmentCode(tx: any) {
  const today = todayCodePH();
  const count = await tx.appointment.count();
  return `APT-${today}-${String(count + 1).padStart(4, "0")}`;
}

async function createSaleCode(tx: any) {
  const today = todayCodePH();
  const count = await tx.sale.count();
  return `TRX-${today}-${String(count + 1).padStart(4, "0")}`;
}

async function createPaymentCode(tx: any) {
  const today = todayCodePH();
  const count = await tx.payment.count();
  return `PAY-${today}-${String(count + 1).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const cartItems = body.cartItems;
    const downPayment = Number(body.downPayment || 150);

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (downPayment !== 150) {
      return NextResponse.json(
        { error: "Invalid downpayment amount" },
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

    const result = await db.$transaction(async (tx) => {
      const firstItem = cartItems[0];

      if (!firstItem?.barberId) {
        throw new Error("Missing barber");
      }

      const serviceIds = cartItems.map((item: any) => item.serviceId);
      const uniqueServiceIds = [...new Set(serviceIds)] as string[];

      const services = await tx.service.findMany({
        where: {
          id: {
            in: uniqueServiceIds,
          },
        },
      });

      if (services.length !== uniqueServiceIds.length) {
        const foundIds = new Set(services.map((service: any) => service.id));
        const missingIds = uniqueServiceIds.filter((id) => !foundIds.has(id));

        throw new Error(`Services not found: ${missingIds.join(", ")}`);
      }

      const subtotal = cartItems.reduce((sum: number, item: any) => {
        return sum + Number(item.servicePrice || 0);
      }, 0);

      const sale = await tx.sale.create({
        data: {
          saleCode: await createSaleCode(tx),
          customerId: dbUser.customer!.id,
          barberId: firstItem.barberId,
          source: "BOOKING",
          status: "PENDING",
          subtotal,
          discount: 0,
          totalAmount: subtotal,
        },
      });

      const createdAppointments: Awaited<
        ReturnType<typeof tx.appointment.create>
      >[] = [];

      for (const item of cartItems) {
        const service = services.find((s: any) => s.id === item.serviceId);

        if (!service) {
          throw new Error("Service not found");
        }

        const itemPrice = Number(item.servicePrice || service.price);

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            serviceId: item.serviceId,
            quantity: 1,
            price: itemPrice,
            subtotal: itemPrice,
          },
        });

        const appointment = await tx.appointment.create({
          data: {
            appointmentCode: await createAppointmentCode(tx),
            customerId: dbUser.customer!.id,
            barberId: item.barberId,
            serviceId: item.serviceId,
            saleId: sale.id,
            appointmentDate: parsePHDateOnly(item.appointmentDate),
            startMinutes: Number(item.startMinutes),
            endMinutes: Number(item.endMinutes),
            status: "PENDING",
            source: "BOOKING",
          },
        });

        createdAppointments.push(appointment);
      }

      const payment = await tx.payment.create({
        data: {
          saleId: sale.id,
          paymentCode: await createPaymentCode(tx),
          amount: subtotal,
          downPayment: 150,
          discount: 0,
          method: null,
          status: "PENDING",
          paymongoCheckoutUrl: PAYMONGO_TEST_LINK,
        },
      });

      return {
        sale,
        payment,
        appointments: createdAppointments,
      };
    });

    return NextResponse.json({
      ok: true,
      checkoutUrl: PAYMONGO_TEST_LINK,
      sale: result.sale,
      payment: result.payment,
      appointments: result.appointments,
    });
  } catch (error) {
    console.error("CONFIRM APPOINTMENT ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to confirm appointment",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}