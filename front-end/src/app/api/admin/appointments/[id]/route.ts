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
      !["OWNER", "RECEPTIONIST", "BARBER"].includes(session.user.role)
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

    console.log("APPOINTMENT UPDATE BODY:", body);

    const {
      barberId,
      serviceId,
      appointmentDate,
      startMinutes,
      endMinutes,
      status,
      afterServicePhotoUrl,
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

    await db.appointment.update({
      where: { id },
      data,
    });

    if (afterServicePhotoUrl) {
      console.log("SAVING AFTER SERVICE PHOTO:", afterServicePhotoUrl);

      const existingPhoto = await db.afterServicePhoto.findFirst({
        where: {
          appointmentId: id,
        },
      });

      if (existingPhoto) {
        await db.afterServicePhoto.update({
          where: {
            id: existingPhoto.id,
          },
          data: {
            imageUrl: afterServicePhotoUrl,
          },
        });
      } else {
        await db.afterServicePhoto.create({
          data: {
            appointmentId: id,
            imageUrl: afterServicePhotoUrl,
          },
        });
      }
    }

    const updatedAppointment = await db.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        barber: true,
        service: true,
        payment: true,
        afterServicePhotos: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      afterServicePhotoUrl:
        updatedAppointment?.afterServicePhotos?.[0]?.imageUrl || null,
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