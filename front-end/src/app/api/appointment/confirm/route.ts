import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

import { parsePHDateOnly } from "@/lib/dateUtils";
import { createUniqueCode } from "@/lib/createCode";

const ALLOWED_PAYMONGO_METHODS = ["card", "gcash", "qrph"];
const CREATE_CHECKOUT_FUNCTION_NAME = "smooth-task";

type TransactionClient = Prisma.TransactionClient;

interface AppointmentCartItem {
  barberId: string;
  serviceId: string;
  servicePrice: number;
  appointmentDate: string;
  startMinutes: number;
  endMinutes: number;
}

function getCreateCheckoutUrl() {
  if (process.env.PAYMONGO_CREATE_CHECKOUT_URL) {
    return process.env.PAYMONGO_CREATE_CHECKOUT_URL;
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${CREATE_CHECKOUT_FUNCTION_NAME}`;
  }

  return "";
}

async function createPayMongoCheckout(params: {
  checkoutEndpoint: string;
  checkoutHeaders: Record<string, string>;
  description: string;
  referenceNumber: string;
  paymentMethods: string[];
  successUrl: string;
  cancelUrl: string;
  failedUrl: string;
  metadata: Record<string, string>;
}) {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  if (secretKey) {
    const response = await fetch(
      "https://api.paymongo.com/v2/checkout_sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString(
            "base64"
          )}`,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              line_items: [
                {
                  name: params.description,
                  amount: 15000,
                  currency: "PHP",
                  quantity: 1,
                },
              ],
              payment_method_types: params.paymentMethods,
              success_url: params.successUrl,
              cancel_url: params.cancelUrl,
              failed_url: params.failedUrl,
              reference_number: params.referenceNumber,
              send_email_receipt: true,
              show_description: true,
              show_line_items: true,
              description: "EstiloMo Appointment Downpayment",
              metadata: params.metadata,
            },
          },
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        data,
        error:
          data.errors?.[0]?.detail || data.error || "Failed to create checkout",
      };
    }

    return {
      ok: true,
      data: {
        checkout_url: data.data.attributes.checkout_url,
        checkout_session_id: data.data.id,
      },
    };
  }

  const response = await fetch(params.checkoutEndpoint, {
    method: "POST",
    headers: params.checkoutHeaders,
    body: JSON.stringify({
      amount: 150,
      description: params.description,
      referenceNumber: params.referenceNumber,
      paymentMethods: params.paymentMethods,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      metadata: params.metadata,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      data,
      error:
        data.error ||
        data.errors?.[0]?.detail ||
        "Failed to create PayMongo checkout",
    };
  }

  return {
    ok: true,
    data,
  };
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

    const cartItems = body.cartItems as AppointmentCartItem[];
    const downPayment = Number(body.downPayment || 150);
    const paymentMethods = Array.isArray(body.paymentMethods)
      ? body.paymentMethods.filter((method: unknown) => typeof method === "string")
      : typeof body.paymentMethod === "string"
      ? [body.paymentMethod]
      : [];

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (downPayment !== 150) {
      return NextResponse.json(
        { error: "Invalid downpayment amount" },
        { status: 400 }
      );
    }

    if (
      paymentMethods.length === 0 ||
      paymentMethods.some(
        (method: string) => !ALLOWED_PAYMONGO_METHODS.includes(method)
      )
    ) {
      return NextResponse.json(
        { error: "Invalid payment method" },
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

      const serviceIds = cartItems.map((item) => item.serviceId);
      const uniqueServiceIds = [...new Set(serviceIds)] as string[];

      const services = await tx.service.findMany({
        where: {
          id: {
            in: uniqueServiceIds,
          },
        },
      });

      if (services.length !== uniqueServiceIds.length) {
        const foundIds = new Set(services.map((service) => service.id));
        const missingIds = uniqueServiceIds.filter((id) => !foundIds.has(id));

        throw new Error(`Services not found: ${missingIds.join(", ")}`);
      }

      const subtotal = cartItems.reduce((sum, item) => {
        return sum + Number(item.servicePrice || 0);
      }, 0);

      const sale = await tx.sale.create({
        data: {
          saleCode: await createUniqueCode("TRX"),
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
        const service = services.find((s) => s.id === item.serviceId);

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
            appointmentCode: await createUniqueCode("APT"),
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
          paymentCode: await createUniqueCode("PAY"),
          amount: subtotal,
          downPayment: 150,
          discount: 0,
          method: null,
          status: "PENDING",
        },
      });

      return {
        sale,
        payment,
        appointments: createdAppointments,
      };
    });

    const checkoutEndpoint = getCreateCheckoutUrl();

    if (!checkoutEndpoint) {
      return NextResponse.json(
        { error: "PayMongo checkout function is not configured" },
        { status: 500 }
      );
    }

    const checkoutHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      checkoutHeaders.apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      checkoutHeaders.Authorization = `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
    }

    const appOrigin = req.headers.get("origin") || req.nextUrl.origin;
    const checkoutSuccessUrl = `${appOrigin}/myAppointments?payment=success&saleId=${encodeURIComponent(
      result.sale.id
    )}&saleCode=${encodeURIComponent(result.sale.saleCode)}`;
    const checkoutCancelUrl = `${appOrigin}/appointment?payment=cancel&saleId=${encodeURIComponent(
      result.sale.id
    )}&saleCode=${encodeURIComponent(result.sale.saleCode)}`;
    const checkoutFailedUrl = `${appOrigin}/appointment?payment=failed&saleId=${encodeURIComponent(
      result.sale.id
    )}&saleCode=${encodeURIComponent(result.sale.saleCode)}`;

    const checkoutResult = await createPayMongoCheckout({
      checkoutEndpoint,
      checkoutHeaders,
      description: "Appointment Downpayment",
      referenceNumber: result.sale.saleCode,
      paymentMethods,
      successUrl: checkoutSuccessUrl,
      cancelUrl: checkoutCancelUrl,
      failedUrl: checkoutFailedUrl,
      metadata: {
        saleId: result.sale.id,
        saleCode: result.sale.saleCode,
        paymentId: result.payment.id,
        customerId: result.sale.customerId,
      },
    });

    const checkoutData = checkoutResult.data;

    if (!checkoutResult.ok || !checkoutData?.checkout_url) {
      console.error("PAYMONGO CHECKOUT ERROR:", checkoutData);

      return NextResponse.json(
        {
          error:
            checkoutResult.error ||
            "Failed to create PayMongo checkout",
        },
        { status: 502 }
      );
    }

    await db.payment.update({
      where: {
        id: result.payment.id,
      },
      data: {
        paymongoCheckoutUrl: checkoutData.checkout_url,
        paymongoCheckoutSessionId:
          checkoutData.checkout_session_id || checkoutData.checkoutSessionId,
      },
    });

    return NextResponse.json({
      ok: true,
      checkoutUrl: checkoutData.checkout_url,
      checkoutSessionId:
        checkoutData.checkout_session_id || checkoutData.checkoutSessionId,
      saleId: result.sale.id,
      saleCode: result.sale.saleCode,
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
