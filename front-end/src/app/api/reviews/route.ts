import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// =========================
// GET REVIEWS / MY REVIEWS / COMPLETED APPOINTMENTS
// =========================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const mine = searchParams.get("mine");
    const completedAppointments = searchParams.get("completedAppointments");

    // =========================
    // COMPLETED APPOINTMENTS AVAILABLE FOR REVIEW
    // /api/reviews?completedAppointments=true
    // =========================
    if (completedAppointments === "true") {
      const session = await auth();

      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
          customer: true,
        },
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

      return NextResponse.json({ appointments });
    }

    // =========================
    // PUBLIC REVIEWS
    // /api/reviews
    // =========================
    if (!mine) {
      const reviews = await prisma.review.findMany({
        where: {
          isVisible: true,
        },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json({ reviews });
    }

    // =========================
    // MY REVIEWS
    // /api/reviews?mine=true
    // =========================
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ reviews: [] });
    }

    const reviews = await prisma.review.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("GET REVIEWS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load reviews" },
      { status: 500 }
    );
  }
}

// =========================
// CREATE REVIEW
// =========================
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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

    const { appointmentId, rating, comment } = await req.json();

    if (!appointmentId || !rating || !comment?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        customerId: user.customer.id,
        status: "COMPLETED",
      },
      include: {
        service: true,
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
  } catch (error) {
    console.error("CREATE REVIEW ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}