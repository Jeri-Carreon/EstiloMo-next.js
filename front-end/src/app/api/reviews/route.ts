import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine");
    const completedAppointments = searchParams.get("completedAppointments");

    if (completedAppointments === "true") {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const dbUser = await db.user.findUnique({
        where: { email: user.email },
        include: { customer: true },
      });

      if (!dbUser?.customer) {
        return NextResponse.json({ appointments: [] });
      }

      const appointments = await db.appointment.findMany({
        where: {
          customerId: dbUser.customer.id,
          status: "COMPLETED",
          review: null,
        },
        include: {
          service: true,
          barber: true,
        },
        orderBy: { appointmentDate: "desc" },
      });

      const reviewedSaleIds = await db.review.findMany({
        where: {
          userId: dbUser.id,
          saleId: { not: null },
        },
        select: { saleId: true },
      });

      const reviewedSaleIdSet = new Set(
        reviewedSaleIds
          .map((review) => review.saleId)
          .filter((id): id is string => Boolean(id))
      );

      const sales = await db.sale.findMany({
        where: {
          customerId: dbUser.customer.id,
          status: "PAID",
          source: "WALKIN",
          id: {
            notIn: [...reviewedSaleIdSet],
          },
        },
        include: {
          barber: true,
          items: {
            include: {
              service: true,
            },
          },
          appointments: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const reviewables = [
        ...appointments.map((appointment) => ({
          id: `appointment:${appointment.id}`,
          sourceType: "BOOKING",
          appointmentId: appointment.id,
          saleId: null,
          appointmentCode: appointment.appointmentCode,
          appointmentDate: appointment.appointmentDate,
          service: appointment.service,
          barber: appointment.barber,
        })),

        ...sales.map((sale) => {
          const firstItem = sale.items[0];
          const firstAppointment = sale.appointments[0];

          return {
            id: `sale:${sale.id}`,
            sourceType: sale.source,
            appointmentId: null,
            saleId: sale.id,
            appointmentCode: sale.saleCode,
            appointmentDate: firstAppointment?.appointmentDate || sale.createdAt,
            service: {
              id: firstItem?.service?.id || firstItem?.serviceId || "",
              name:
                sale.items
                  .map((item) => item.service?.name)
                  .filter(Boolean)
                  .join(", ") || "Walk-in Service",
            },
            barber: sale.barber
              ? {
                  id: sale.barber.id,
                  firstName: sale.barber.firstName,
                  lastName: sale.barber.lastName,
                }
              : { id: "", firstName: "", lastName: "N/A" },
          };
        }),
      ];

      return NextResponse.json({ appointments: reviewables });
    }

    if (!mine) {
      const reviews = await db.review.findMany({
        where: { isVisible: true },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
          appointment: {
            include: { barber: true, service: true },
          },
          sale: {
            include: {
              barber: true,
              items: { include: { service: true } },
            },
          },
        },
      });

      return NextResponse.json({ reviews });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ reviews: [] });
    }

    const reviews = await db.review.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        appointment: {
          include: { barber: true, service: true },
        },
        sale: {
          include: {
            barber: true,
            items: { include: { service: true } },
          },
        },
      },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("GET REVIEWS ERROR:", error);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { email: user.email },
      include: { customer: true },
    });

    if (!dbUser?.customer) {
      return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });
    }

    const { appointmentId, saleId, rating, comment, isAnonymous = false } = await req.json();

    if (!rating || !comment?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (saleId) {
      const sale = await db.sale.findFirst({
        where: {
          id: saleId,
          customerId: dbUser.customer.id,
          status: "PAID",
        },
        include: {
          items: { include: { service: true } },
          barber: true,
        },
      });

      if (!sale) {
        return NextResponse.json({ error: "You can only review paid sales." }, { status: 400 });
      }

      const existingReview = await db.review.findFirst({ where: { saleId } });

      if (existingReview) {
        return NextResponse.json({ error: "You already reviewed this sale." }, { status: 400 });
      }

      const serviceName =
        sale.items.map((item) => item.service?.name).filter(Boolean).join(", ") || "Walk-in Service";

      const review = await db.review.create({
        data: {
          saleId,
          userId: dbUser.id,
          service: serviceName,
          rating: Number(rating),
          comment: comment.trim(),
          isAnonymous: Boolean(isAnonymous),
          status: "PENDING",
          isVisible: false,
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          sale: {
            include: {
              barber: true,
              items: { include: { service: true } },
            },
          },
        },
      });

      return NextResponse.json({ review }, { status: 201 });
    }

    if (appointmentId) {
      const appointment = await db.appointment.findFirst({
        where: {
          id: appointmentId,
          customerId: dbUser.customer.id,
          status: "COMPLETED",
        },
        include: { service: true, barber: true },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "You can only review completed appointments." },
          { status: 400 }
        );
      }

      const existingReview = await db.review.findFirst({ where: { appointmentId } });

      if (existingReview) {
        return NextResponse.json(
          { error: "You already reviewed this appointment." },
          { status: 400 }
        );
      }

      const review = await db.review.create({
        data: {
          appointmentId,
          userId: dbUser.id,
          service: appointment.service.name,
          rating: Number(rating),
          comment: comment.trim(),
          isAnonymous: Boolean(isAnonymous),
          status: "PENDING",
          isVisible: false,
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          appointment: { include: { barber: true, service: true } },
        },
      });

      return NextResponse.json({ review }, { status: 201 });
    }

    return NextResponse.json({ error: "Missing appointment or sale id" }, { status: 400 });
  } catch (error) {
    console.error("CREATE REVIEW ERROR:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}