import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { DateTime } from 'luxon';
import { parsePHDateOnly, todayCodePH } from '@/lib/dateUtils';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase configuration");
  }

  return createAdminClient(url, key);
}


async function createAppointmentCode(tx: any) {
  const today = todayCodePH(); // ← PH date
  const count = await tx.appointment.count();
  return `APT-${today}-${String(count + 1).padStart(4, "0")}`;
}

async function createSaleCode(tx: any) {
  const today = todayCodePH(); // ← PH date
  const count = await tx.sale.count();
  return `TRX-${today}-${String(count + 1).padStart(4, "0")}`;
}

async function createPaymentCode(tx: any) {
  const today = todayCodePH(); // ← PH date
  const count = await tx.payment.count();
  return `PAY-${today}-${String(count + 1).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    const cartItemsRaw = formData.get("cartItems");
    const downPayment = Number(formData.get("downPayment") || 150);
    const paymentScreenshot = formData.get("paymentScreenshot") as File | null;

    if (!cartItemsRaw) {
      return NextResponse.json({ error: "Missing cart items" }, { status: 400 });
    }

    const cartItems = JSON.parse(String(cartItemsRaw));

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (!paymentScreenshot) {
      return NextResponse.json(
        { error: "Payment screenshot is required" },
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

    const bytes = await paymentScreenshot.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExt = paymentScreenshot.name.split(".").pop() || "png";
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const filePath = `payments/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("payment-screenshots")
      .upload(filePath, buffer, {
        contentType: paymentScreenshot.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("SUPABASE UPLOAD ERROR:", uploadError);

      return NextResponse.json(
        {
          error: "Failed to upload payment screenshot",
          details: uploadError.message,
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("payment-screenshots")
      .getPublicUrl(filePath);

    const screenshotUrl = publicUrlData.publicUrl;

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
          downPayment,
          discount: 0,
          method: null,
          status: "PENDING",
          screenshotUrl,
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