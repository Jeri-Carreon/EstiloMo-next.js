import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
import { logAppointmentEdited, logAppointmentCancelled, logAfterServicePhotoUploaded, } from "@/lib/securityLogEvents";

function createCode(prefix: string) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${today}-${random}`;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUser();

    if (!user || !["OWNER", "RECEPTIONIST", "BARBER"].includes(user.role)) {
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

    const existingAppointment = await db.appointment.findUnique({
      where: { id },
      include: {
        service: true,
      },
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const data: any = {};

    if (barberId) data.barber = { connect: { id: barberId } };
    if (serviceId) data.service = { connect: { id: serviceId } };
    if (appointmentDate) data.appointmentDate = new Date(appointmentDate);

    if (startMinutes !== undefined && startMinutes !== "") {
      data.startMinutes = Number(startMinutes);
    }

    if (endMinutes !== undefined && endMinutes !== "") {
      data.endMinutes = Number(endMinutes);
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

    if (status !== undefined && status !== null && status !== "") {
      const currentStatus = existingAppointment.status.toUpperCase();
      const requestedStatus = String(status).toUpperCase();
      const statusChanged = requestedStatus !== currentStatus;

      if (statusChanged) {
        if (currentStatus !== "PENDING") {
          return NextResponse.json(
            {
              error:
                "Processed appointment status cannot be edited from the appointments module.",
            },
            { status: 400 }
          );
        }

        if (!["PENDING", "SCHEDULED", "REJECTED"].includes(requestedStatus)) {
          return NextResponse.json(
            {
              error:
                "Pending appointments can only be changed to Pending, Scheduled, or Rejected.",
            },
            { status: 400 }
          );
        }

        data.status = requestedStatus;
      }
    }

    const updatedBaseAppointment = await db.appointment.update({
      where: { id },
      data,
      include: {
        service: true,
      },
    });

    if (data.status === "SCHEDULED" && !updatedBaseAppointment.saleId) {
      const sale = await db.sale.create({
        data: {
          saleCode: createCode("TRX"),
          customerId: updatedBaseAppointment.customerId,
          barberId: updatedBaseAppointment.barberId,
          source: "BOOKING",
          status: "PENDING",
          subtotal: Number(updatedBaseAppointment.service.price),
          discount: 0,
          totalAmount: Number(updatedBaseAppointment.service.price),
        },
      });

      await db.saleItem.create({
        data: {
          saleId: sale.id,
          serviceId: updatedBaseAppointment.serviceId,
          quantity: 1,
          price: Number(updatedBaseAppointment.service.price),
          subtotal: Number(updatedBaseAppointment.service.price),
        },
      });

      await db.payment.create({
        data: {
          saleId: sale.id,
          paymentCode: createCode("PAY"),
          amount: Number(updatedBaseAppointment.service.price),
          downPayment: 0,
          discount: 0,
          method: null,
          status: "PENDING",
        },
      });

      await db.appointment.update({
        where: { id },
        data: {
          saleId: sale.id,
        },
      });
    }

    if (afterServicePhotoUrl) {
      await db.afterServicePhoto.create({
        data: {
          appointmentId: id,
          imageUrl: afterServicePhotoUrl,
        },
      });

      await logAfterServicePhotoUploaded(
        req,
        user,
        existingAppointment.appointmentCode
      );
    }

    const updatedAppointment = await db.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        barber: true,
        service: true,
        payment: true,
        afterServicePhotos: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (updatedAppointment) {
      await logAppointmentEdited(req, user, updatedAppointment.appointmentCode);
    }

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
    const user = await getAdminUser();

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

    const appointment = await db.appointment.findUnique({
      where: { id },
      select: {
        appointmentCode: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    await db.appointment.delete({
      where: { id },
    });

    await logAppointmentCancelled(req, user, appointment.appointmentCode);

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