import { NextResponse } from "next/server";
import { SaleSource } from "@prisma/client";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
import { createUniqueCode } from "@/lib/createCode";
import { logSaleCreated,logDiscountApplied, } from "@/lib/securityLogEvents";
import { hasAnyRole } from "@/lib/adminTabs";
import { getSpecialDiscountPricing, getVatInclusivePricing } from "@/lib/salesPricing";
import { getVatRate } from "@/lib/appointmentSettings";

export const dynamic = "force-dynamic";

type SaleItemInput = {
  serviceId?: string;
  quantity?: number;
};

type SpecialDiscountType = "PWD" | "SENIOR";

function resolveSpecialDiscountType(value: unknown, legacyPwdDiscount?: boolean) {
  if (value === "PWD" || value === "SENIOR") return value;
  return legacyPwdDiscount ? "PWD" : null;
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function calculatePwdPricing(subtotal: number, vatRate: number) {
  const pricing = getSpecialDiscountPricing(subtotal, vatRate);

  return {
    vatAmount: pricing.vatAmount,
    discount: pricing.discountAmount,
    totalAmount: pricing.totalAmount,
  };
}

function getFullGrossTotal(sale: {
  source: SaleSource;
  totalAmount: unknown;
  items: { price: unknown; quantity: number }[];
}) {
  const itemGrossTotal = sale.items.reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  return sale.source === SaleSource.BOOKING && itemGrossTotal > 0
    ? itemGrossTotal
    : Number(sale.totalAmount || 0);
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

export async function GET() {
  try {
    const user = await getAdminUser();

    if (!hasAnyRole(user, ["OWNER", "RECEPTIONIST"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [rawSales, vatRate] = await Promise.all([
      db.sale.findMany({
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
      }),
      getVatRate(),
    ]);

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
      sales: sales.map((sale) => {
        const grossTotal = getFullGrossTotal(sale);
        const vatExempt = Boolean(sale.vatExempt || sale.payment?.vatExempt || sale.pwdDiscount || sale.payment?.pwdDiscount);
        const vatAmount = vatExempt
          ? Number(sale.vatAmount || sale.payment?.vatAmount || 0)
          : getVatInclusivePricing(grossTotal, vatRate).vatAmount;

        return ({
        id: sale.id,
        saleCode: sale.saleCode,
        source: sale.source,
        status: sale.status,
        subtotal: Number(sale.subtotal),
        discount: Number(sale.discount),
        pwdDiscount: sale.pwdDiscount,
        pwdId: sale.pwdId,
        specialDiscountType: sale.specialDiscountType,
        vatExempt,
        vatAmount,
        totalAmount: Number(sale.totalAmount),
        grossTotal,
        createdAt: sale.createdAt,

        customer: {
          id: sale.customer.id,
          customerCode: sale.customer.customerCode,
          name: [sale.customer.firstName, sale.customer.lastName]
            .filter(Boolean)
            .join(" "),
          mobileNumber: sale.customer.mobileNumber,
        },

        barber: (() => {
          // Prefer the sale-level barber (used for WALKIN). If missing,
          // aggregate first names from appointment barbers for BOOKING.
          if (sale.barber) {
            const firstName = sale.barber.firstName || "";
            const lastName = sale.barber.lastName || "";
            const combined = [firstName, lastName].filter(Boolean).join(" ");

            return {
              id: sale.barber.id,
              name: combined || sale.barber.firstName || "",
            };
          }

          const barberNames = sale.appointments
            .map((appt) => appt.barber?.firstName)
            .filter(Boolean);

          return barberNames.length
            ? { id: "", name: [...new Set(barberNames)].join(", ") }
            : null;
        })(),

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
              pwdDiscount: sale.payment.pwdDiscount,
              pwdId: sale.payment.pwdId,
              specialDiscountType: sale.payment.specialDiscountType,
              vatExempt: sale.payment.vatExempt,
              vatAmount: Number(sale.payment.vatAmount),
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
          barber: appointment.barber
            ? {
                id: appointment.barber.id,
                name: [appointment.barber.firstName, appointment.barber.lastName]
                  .filter(Boolean)
                  .join(" "),
              }
            : null,
          payment: appointment.payment
            ? {
                id: appointment.payment.id,
                paymentCode: appointment.payment.paymentCode,
                amount: Number(appointment.payment.amount),
                downPayment: Number(appointment.payment.downPayment),
                discount: Number(appointment.payment.discount),
                pwdDiscount: appointment.payment.pwdDiscount,
                pwdId: appointment.payment.pwdId,
                specialDiscountType: appointment.payment.specialDiscountType,
                vatExempt: appointment.payment.vatExempt,
                vatAmount: Number(appointment.payment.vatAmount),
                method: appointment.payment.method,
                status: appointment.payment.status,
                gcashRefNo: appointment.payment.gcashRefNo,
                screenshotUrl: appointment.payment.screenshotUrl,
              }
            : null,
        })),

      }); }),
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

    if (!hasAnyRole(user, ["OWNER", "RECEPTIONIST"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const vatRate = await getVatRate();

    const {
      customerId,
      items,
      discount = 0,
      method = "CASH",
      barberId,
      pwdDiscount = false,
      pwdId,
      specialDiscountType,
    } = body;

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

    const resolvedSpecialDiscountType = resolveSpecialDiscountType(
      specialDiscountType,
      pwdDiscount === true
    );
    const usePwdDiscount = Boolean(resolvedSpecialDiscountType);
    const normalizedPwdId = typeof pwdId === "string" ? pwdId.trim() : "";

    if (usePwdDiscount && !normalizedPwdId) {
      return NextResponse.json(
        { error: "PWD/Senior Citizen ID is required" },
        { status: 400 }
      );
    }

    const parsedDiscount = usePwdDiscount ? 0 : Number(discount || 0);
    const typedItems = items as SaleItemInput[];
    const serviceIds = typedItems
      .map((item) => item.serviceId)
      .filter((serviceId): serviceId is string => Boolean(serviceId));
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
          downPaymentStatus: "WALKIN",
          subtotal: 0,
          discount: parsedDiscount,
          totalAmount: 0,
        },
      });

      for (const rawItem of typedItems) {
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

      const pwdPricing = usePwdDiscount ? calculatePwdPricing(subtotal, vatRate) : null;
      const totalAmount = pwdPricing?.totalAmount ?? Math.max(subtotal - parsedDiscount, 0);
      const vatAmount =
        pwdPricing?.vatAmount ??
        getVatInclusivePricing(totalAmount, vatRate).vatAmount;
      const finalDiscount = pwdPricing?.discount ?? parsedDiscount;

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          subtotal,
          discount: finalDiscount,
          pwdDiscount: usePwdDiscount,
          pwdId: usePwdDiscount ? normalizedPwdId : null,
          specialDiscountType: resolvedSpecialDiscountType,
          vatExempt: usePwdDiscount,
          vatAmount,
          totalAmount,
        },
      });

      await tx.payment.create({
        data: {
          sale: { connect: { id: sale.id } },
          paymentCode,
          amount: totalAmount,
          downPayment: 0,
          discount: finalDiscount,
          pwdDiscount: usePwdDiscount,
          pwdId: usePwdDiscount ? normalizedPwdId : null,
          specialDiscountType: resolvedSpecialDiscountType,
          vatExempt: usePwdDiscount,
          vatAmount,
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
      {
        error: "Failed to create sale",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
