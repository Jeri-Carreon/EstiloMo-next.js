import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.email ||
      !["OWNER", "RECEPTIONIST"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing appointment id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      barberId,
      serviceId,
      appointmentDate,
      startMinutes,
      endMinutes,
      status,
    } = body;

    const data: any = {};

    if (barberId) {
      data.barber = {
        connect: { id: barberId },
      };
    }

    if (serviceId) {
      data.service = {
        connect: { id: serviceId },
      };
    }

    if (appointmentDate) {
      data.appointmentDate = new Date(appointmentDate);
    }

    if (startMinutes !== undefined && startMinutes !== "") {
      data.startMinutes = Number(startMinutes);
    }

    if (endMinutes !== undefined && endMinutes !== "") {
      data.endMinutes = Number(endMinutes);
    }

    if (status) {
      data.status = status;
    }

    if (
      data.startMinutes !== undefined &&
      data.endMinutes !== undefined &&
      data.endMinutes <= data.startMinutes
    ) {
      return NextResponse.json(
        { error: "Invalid appointment time" },
        { status: 400 }
      );
    }

    const appointment = await db.appointment.update({
      where: { id },
      data,
      include: {
        customer: true,
        barber: true,
        service: true,
        payment: true,
        afterServicePhotos: true,
      },
    });

    if (serviceId) {
      const service = await db.service.findUnique({
        where: { id: serviceId },
        select: { price: true },
      });

      const existingPayment = await db.payment.findFirst({
        where: { appointmentId: id },
      });

      if (existingPayment) {
        await db.payment.update({
          where: { id: existingPayment.id },
          data: {
            amount: Number(service?.price || 0),
          },
        });
      } else {
        await db.payment.create({
          data: {
            appointmentId: id,
            amount: Number(service?.price || 0),
            downPayment: 150,
            method: "GCASH",
            status: "PENDING",
            screenshotUrl: null,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error("UPDATE APPOINTMENT ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to update appointment",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.email ||
      !["OWNER", "RECEPTIONIST"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing appointment id" },
        { status: 400 }
      );
    }

    await db.appointment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE APPOINTMENT ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to delete appointment",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}