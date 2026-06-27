import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";

import {
  logSaleCreated,
  logDiscountApplied,
} from "@/lib/securityLogEvents";

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

async function createSaleCode() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = await db.sale.count();

  return `TRX-${today}-${String(count + 1).padStart(4, "0")}`;
}

async function createPaymentCode() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = await db.payment.count();

  return `PAY-${today}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET() {
  try {
    const user = await getAdminUser();

    if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawSales = await db.sale.findMany({
      include: {
        customer: true,
        barber: true,
        items: { include: { service: true } },
        payment: true,
        appointments: {
          include: {
            service: true,
            barber: true,
            payment: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const sales = rawSales.filter((sale) => {
      if (sale.source === "WALKIN") return true;

      if (sale.source === "BOOKING") {
        return sale.appointments.some((appointment) =>
          ["SCHEDULED", "COMPLETED", "CANCELLED", "NOSHOW"].includes(
            appointment.status
          )
        );
      }

      return false;
    });

    return NextResponse.json({
      sales: sales.map((sale) => ({
        id: sale.id,
        saleCode: sale.saleCode,
        source: sale.source,
        status: sale.status,
        subtotal: Number(sale.subtotal),
        discount: Number(sale.discount),
        totalAmount: Number(sale.totalAmount),
        createdAt: sale.createdAt,

        customer: {
          id: sale.customer.id,
          customerCode: sale.customer.customerCode,
          name: [sale.customer.firstName, sale.customer.lastName]
            .filter(Boolean)
            .join(" "),
          mobileNumber: sale.customer.mobileNumber,
        },

        barber: sale.barber
          ? {
              id: sale.barber.id,
              name: [sale.barber.firstName, sale.barber.lastName]
                .filter(Boolean)
                .join(" "),
            }
          : null,

        items: sale.items.map((item) => ({
          id: item.id,
          serviceId: item.serviceId,
          serviceName: item.service.name,
          quantity: item.quantity,
          price: Number(item.price),
          subtotal: Number(item.subtotal),
        })),

        payment: sale.payment
          ? {
              id: sale.payment.id,
              paymentCode: sale.payment.paymentCode,
              amount: Number(sale.payment.amount),
              downPayment: Number(sale.payment.downPayment),
              discount: Number(sale.payment.discount),
              method: sale.payment.method,
              status: sale.payment.status,
              gcashRefNo: sale.payment.gcashRefNo,
              screenshotUrl: sale.payment.screenshotUrl,
            }
          : null,

        appointments: sale.appointments.map((appointment) => ({
          id: appointment.id,
          appointmentCode: appointment.appointmentCode,
          status: appointment.status,
          serviceName: appointment.service.name,
          appointmentDate: appointment.appointmentDate,
          startMinutes: appointment.startMinutes,
          endMinutes: appointment.endMinutes,
          schedule: `${appointment.appointmentDate.toLocaleDateString()} ${minutesToTime(
            appointment.startMinutes
          )} - ${minutesToTime(appointment.endMinutes)}`,
          payment: appointment.payment
            ? {
                id: appointment.payment.id,
                paymentCode: appointment.payment.paymentCode,
                amount: Number(appointment.payment.amount),
                downPayment: Number(appointment.payment.downPayment),
                discount: Number(appointment.payment.discount),
                method: appointment.payment.method,
                status: appointment.payment.status,
                gcashRefNo: appointment.payment.gcashRefNo,
                screenshotUrl: appointment.payment.screenshotUrl,
              }
            : null,
        })),
      })),
    });
  } catch (error) {
    console.error("GET SALES ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAdminUser();

    if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const { customerId, items, discount = 0, method = "CASH", barberId } = body;

    if (!customerId) {
      return NextResponse.json({ error: "Missing customer" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length < 1) {
      return NextResponse.json(
        { error: "Please add at least one service" },
        { status: 400 }
      );
    }

    const parsedDiscount = Number(discount || 0);
    const serviceIds = items.map((item: any) => item.serviceId);

    const services = await db.service.findMany({
      where: {
        id: { in: serviceIds },
        isAvailable: true,
      },
    });

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: "One or more services are invalid" },
        { status: 400 }
      );
    }

    const createdSale = await db.$transaction(async (tx) => {
      const saleCode = await createSaleCode();
      const paymentCode = await createPaymentCode();

      let subtotal = 0;

      const sale = await tx.sale.create({
        data: {
          saleCode,
          customerId,
          barberId: barberId || null,
          source: "WALKIN",
          status: "PENDING",
          subtotal: 0,
          discount: parsedDiscount,
          totalAmount: 0,
        },
      });

      for (const rawItem of items) {
        const service = services.find((s) => s.id === rawItem.serviceId);

        if (!service) continue;

        const quantity = Number(rawItem.quantity || 1);
        const price = Number(service.price);
        const itemSubtotal = price * quantity;

        subtotal += itemSubtotal;

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            serviceId: service.id,
            quantity,
            price,
            subtotal: itemSubtotal,
          },
        });
      }

      const totalAmount = Math.max(subtotal - parsedDiscount, 0);

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          subtotal,
          discount: parsedDiscount,
          totalAmount,
        },
      });

      await tx.payment.create({
        data: {
          saleId: sale.id,
          paymentCode,
          amount: totalAmount,
          downPayment: 0,
          discount: parsedDiscount,
          method,
          status: "PENDING",
          gcashRefNo: null,
        },
      });

      return tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          customer: true,
          barber: true,
          items: {
            include: {
              service: true,
            },
          },
          payment: true,
          appointments: {
            include: {
              service: true,
              barber: true,
              payment: true,
            },
          },
        },
      });
    });

    if (createdSale) {
      await logSaleCreated(req, user, createdSale.saleCode);

      if (Number(createdSale.discount || 0) > 0) {
        await logDiscountApplied(req, user, createdSale.saleCode);
      }
    }

    return NextResponse.json(
      { success: true, sale: createdSale },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE SALE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}