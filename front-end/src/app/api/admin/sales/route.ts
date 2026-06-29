import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getAdminUser } from "@/lib/supabase/getUser";

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

/*function createCode(prefix: string) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${today}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function createSaleCode() {
  return createCode("TRX");
}

async function createPaymentCode() {
  return createCode("PAY");
}
*/

async function createUniqueCode(prefix: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fullPrefix = `${prefix}-${date}`;

  // Only check the table relevant to this prefix
  let existingCodes: Set<string>;

  if (prefix === "APT") {
    const rows = await db.appointment.findMany({
      where: { appointmentCode: { startsWith: fullPrefix } },
      select: { appointmentCode: true },
    });
    existingCodes = new Set(rows.map((r) => r.appointmentCode));
  } else if (prefix === "TRX") {
    const rows = await db.sale.findMany({
      where: { saleCode: { startsWith: fullPrefix } },
      select: { saleCode: true },
    });
    existingCodes = new Set(rows.map((r) => r.saleCode));
  } else {
    const rows = await db.payment.findMany({
      where: { paymentCode: { startsWith: fullPrefix } },
      select: { paymentCode: true },
    });
    existingCodes = new Set(rows.map((r) => r.paymentCode).filter(Boolean) as string[]);
  }

  // Try sequential first
  const nextNumber = existingCodes.size + 1;
  let candidate = `${fullPrefix}-${String(nextNumber).padStart(4, "0")}`;

  // If collision, fall back to random loop
  if (existingCodes.has(candidate)) {
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      candidate = `${fullPrefix}-${randomNum}`;
      isUnique = !existingCodes.has(candidate);
    }
  }

  return candidate;
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
      orderBy: {
        createdAt: "desc",
      },
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

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true, isActive: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Selected customer was not found" }, { status: 400 });
    }

    if (!customer.isActive) {
      return NextResponse.json(
        { error: "Unavailable customer cannot be used for sales" },
        { status: 400 }
      );
    }

    if (barberId) {
      const barber = await db.barber.findUnique({
        where: { id: barberId },
        select: { id: true },
      });

      if (!barber) {
        return NextResponse.json({ error: "Selected barber was not found" }, { status: 400 });
      }
    }

    const parsedDiscount = Number(discount || 0);
    const serviceIds = items.map((item: any) => item.serviceId).filter(Boolean);
    const uniqueServiceIds = [...new Set(serviceIds)];

    const services = await db.service.findMany({
      where: {
        id: { in: uniqueServiceIds },
        isAvailable: true,
      },
    });

    const foundIds = new Set(services.map((service) => service.id));
    const missingIds = uniqueServiceIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `One or more services are unavailable: ${missingIds.join(", ")}` },
        { status: 400 }
      );
    }

    const createdSale = await db.$transaction(async (tx) => {
      const saleCode = await createUniqueCode("TRX");
      const paymentCode = await createUniqueCode("PAY");

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
          sale: { connect: { id: sale.id } },
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

    return NextResponse.json(
      { success: true, sale: createdSale },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE SALE ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to create sale",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}