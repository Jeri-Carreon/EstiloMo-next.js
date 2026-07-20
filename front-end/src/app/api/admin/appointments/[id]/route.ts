import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
import { hasAnyRole } from "@/lib/adminTabs";
import { logAppointmentEdited, logAppointmentCancelled, logAfterServicePhotoUploaded, } from "@/lib/securityLogEvents";
import { createUniqueCode } from "@/lib/createCode";
import { parsePHDateOnly, toPHDateKey } from "@/lib/dateUtils";
import {
  AppointmentAvailabilityError,
  assertCustomerAppointmentTimeAvailable,
  assertAppointmentTimeAvailable,
} from "@/lib/appointmentAvailability";

type EditableAppointmentStatus = "PENDING" | "SCHEDULED" | "REJECTED";

type AppointmentUpdateData = {
  barber?: { connect: { id: string } };
  service?: { connect: { id: string } };
  appointmentDate?: Date;
  startMinutes?: number;
  endMinutes?: number;
  status?: EditableAppointmentStatus;
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUser();

    if (!hasAnyRole(user, ["OWNER", "RECEPTIONIST", "BARBER"])) {
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
        customer: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const data: AppointmentUpdateData = {};

    if (barberId) data.barber = { connect: { id: barberId } };
    if (serviceId) data.service = { connect: { id: serviceId } };
    if (appointmentDate) data.appointmentDate = parsePHDateOnly(appointmentDate);

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

        data.status = requestedStatus as EditableAppointmentStatus;
      }
    }

    const schedulingChanged =
      Boolean(barberId) ||
      Boolean(serviceId) ||
      Boolean(appointmentDate) ||
      (startMinutes !== undefined && startMinutes !== "") ||
      (endMinutes !== undefined && endMinutes !== "") ||
      data.status === "SCHEDULED";
    const nextStatus = String(
      data.status ?? existingAppointment.status
    ).toUpperCase();

    if (
      schedulingChanged &&
      ["PENDING", "SCHEDULED"].includes(nextStatus)
    ) {
      const nextService =
        serviceId && serviceId !== existingAppointment.serviceId
          ? await db.service.findUnique({ where: { id: serviceId } })
          : existingAppointment.service;

      if (!nextService) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 }
        );
      }

      const nextDate = data.appointmentDate ?? existingAppointment.appointmentDate;
      const nextDateKey = toPHDateKey(nextDate);

      if (!nextDateKey) {
        return NextResponse.json(
          { error: "Invalid appointment date" },
          { status: 400 }
        );
      }

      await assertCustomerAppointmentTimeAvailable(db, {
        customerId: existingAppointment.customer.id,
        customerEmail:
          existingAppointment.customer.email ||
          existingAppointment.customer.user?.email,
        customerMobileNumber: existingAppointment.customer.mobileNumber,
        date: nextDateKey,
        startMinutes: data.startMinutes ?? existingAppointment.startMinutes,
        endMinutes: data.endMinutes ?? existingAppointment.endMinutes,
        excludeAppointmentId: id,
      });

      await assertAppointmentTimeAvailable(db, {
        barberId: barberId || existingAppointment.barberId,
        date: nextDateKey,
        serviceDurationMinutes: nextService.durationMinutes,
        startMinutes: data.startMinutes ?? existingAppointment.startMinutes,
        endMinutes: data.endMinutes ?? existingAppointment.endMinutes,
        excludeAppointmentId: id,
      });
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
          saleCode: await createUniqueCode("TRX"),
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
          paymentCode: await createUniqueCode("PAY"),
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

    if (error instanceof AppointmentAvailabilityError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

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

    if (!hasAnyRole(user, ["OWNER", "RECEPTIONIST"])) {
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
