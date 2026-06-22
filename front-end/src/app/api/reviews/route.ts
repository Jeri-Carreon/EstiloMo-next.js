import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const mine = searchParams.get("mine");
    const completedAppointments = searchParams.get("completedAppointments");

    if (completedAppointments === "true") {
      const session = await auth();

      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { customer: true },
      });

      if (!user?.customer) {
        return NextResponse.json({ appointments: [] });
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          customerId: user.customer.id,
          status: "COMPLETED",
          review: null,
        },
        include: {
          service: true,
          barber: true,
        },
        orderBy: {
          appointmentDate: "desc",
        },
      });

      const reviewedSaleIds = await prisma.review.findMany({
        where: {
          userId: user.id,
          saleId: {
            not: null,
          },
        },
        select: {
          saleId: true,
        },
      });

      const reviewedSaleIdSet = new Set(
        reviewedSaleIds
          .map((review) => review.saleId)
          .filter((id): id is string => Boolean(id))
      );

      const sales = await prisma.sale.findMany({
        where: {
          customerId: user.customer.id,
          status: "PAID",
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
              : {
                  id: "",
                  firstName: "",
                  lastName: "N/A",
                },
          };
        }),
      ];

      return NextResponse.json({ appointments: reviewables });
    }

    if (!mine) {
      const reviews = await prisma.review.findMany({
        where: {
          isVisible: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          appointment: {
            include: {
              barber: true,
              service: true,
            },
          },
          sale: {
            include: {
              barber: true,
              items: {
                include: {
                  service: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({ reviews });
    }

    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      return NextResponse.json({ reviews: [] });
    }

    const reviews = await prisma.review.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        appointment: {
          include: {
            barber: true,
            service: true,
          },
        },
        sale: {
          include: {
            barber: true,
            items: {
              include: {
                service: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("GET REVIEWS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load reviews" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      include: {
        customer: true,
      },
    });

    if (!user?.customer) {
      return NextResponse.json(
        { error: "Customer profile not found" },
        { status: 404 }
      );
    }

    const {
      appointmentId,
      saleId,
      rating,
      comment,
      isAnonymous = false,
    } = await req.json();

    if (!rating || !comment?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (saleId) {
      const sale = await prisma.sale.findFirst({
        where: {
          id: saleId,
          customerId: user.customer.id,
          status: "PAID",
        },
        include: {
          items: {
            include: {
              service: true,
            },
          },
          barber: true,
        },
      });

      if (!sale) {
        return NextResponse.json(
          { error: "You can only review paid sales." },
          { status: 400 }
        );
      }

      const existingReview = await prisma.review.findFirst({
        where: {
          saleId,
        },
      });

      if (existingReview) {
        return NextResponse.json(
          { error: "You already reviewed this sale." },
          { status: 400 }
        );
      }

      const serviceName =
        sale.items
          .map((item) => item.service?.name)
          .filter(Boolean)
          .join(", ") || "Walk-in Service";

      const review = await prisma.review.create({
        data: {
          saleId,
          userId: user.id,
          service: serviceName,
          rating: Number(rating),
          comment: comment.trim(),
          isAnonymous: Boolean(isAnonymous),
          status: "PENDING",
          isVisible: false,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          sale: {
            include: {
              barber: true,
              items: {
                include: {
                  service: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({ review }, { status: 201 });
    }

    if (appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          customerId: user.customer.id,
          status: "COMPLETED",
        },
        include: {
          service: true,
          barber: true,
        },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "You can only review completed appointments." },
          { status: 400 }
        );
      }

      const existingReview = await prisma.review.findFirst({
        where: {
          appointmentId,
        },
      });

      if (existingReview) {
        return NextResponse.json(
          { error: "You already reviewed this appointment." },
          { status: 400 }
        );
      }

      const review = await prisma.review.create({
        data: {
          appointmentId,
          userId: user.id,
          service: appointment.service.name,
          rating: Number(rating),
          comment: comment.trim(),
          isAnonymous: Boolean(isAnonymous),
          status: "PENDING",
          isVisible: false,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          appointment: {
            include: {
              barber: true,
              service: true,
            },
          },
        },
      });

      return NextResponse.json({ review }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Missing appointment or sale id" },
      { status: 400 }
    );
  } catch (error) {
    console.error("CREATE REVIEW ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}