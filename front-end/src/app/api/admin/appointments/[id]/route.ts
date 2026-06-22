import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getAdminUser } from "@/lib/supabase/getUser"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUser()
    if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      afterServicePhotoUrl,
    } = body;

    const data: any = {};

    if (barberId) {
      data.barber = { connect: { id: barberId } };
    }

    if (serviceId) {
      data.service = { connect: { id: serviceId } };
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
      await db.afterServicePhoto.create({
        data: {
          appointmentId: id,
          imageUrl: afterServicePhotoUrl,
        },
      });
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
      afterServicePhotos: updatedAppointment?.afterServicePhotos || [],
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
    const user = await getAdminUser()
    if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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