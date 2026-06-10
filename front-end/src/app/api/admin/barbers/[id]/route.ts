import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Missing barber id' },
        { status: 400 }
      );
    }

    const barber = await db.barber.findUnique({
      where: { id },
      include: {
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
        appointments: {
          include: {
            barber: true,
            customer: true,
            payment: true,
            service: true,
            afterServicePhotos: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { appointmentDate: 'asc' },
        },
      },
    });

    if (!barber) {
      return NextResponse.json(
        { ok: false, error: 'Barber not found' },
        { status: 404 }
      );
    }

    const result = barber.appointments.map((appointment) => ({
      id: appointment.id,
      barberId: appointment.barberId,
      serviceId: appointment.serviceId,
      appointmentCode: appointment.appointmentCode,
      appointmentDate: appointment.appointmentDate.toISOString(),

      customer: {
        id: appointment.customer.id,
        customerCode: appointment.customer.customerCode,
        name: [appointment.customer.firstName, appointment.customer.lastName]
          .filter(Boolean)
          .join(' '),
      },

      schedule: {
        date: appointment.appointmentDate.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
        }),
        startTime: minutesToTime(appointment.startMinutes),
        endTime: minutesToTime(appointment.endMinutes),
        formatted: `${appointment.appointmentDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })} ${minutesToTime(appointment.startMinutes)} - ${minutesToTime(
          appointment.endMinutes
        )}`,
      },

      service: {
        id: appointment.service.id,
        name: appointment.service.name,
      },

      barber: {
        id: appointment.barber.id,
        name: [appointment.barber.firstName, appointment.barber.lastName]
          .filter(Boolean)
          .join(' '),
      },

      payment: {
        id: appointment.payment?.id || null,
        amount:
          appointment.payment?.amount !== undefined &&
          appointment.payment?.amount !== null
            ? Number(appointment.payment.amount)
            : null,
        downPayment:
          appointment.payment?.downPayment !== undefined &&
          appointment.payment?.downPayment !== null
            ? Number(appointment.payment.downPayment)
            : null,
        method: appointment.payment?.method || null,
        screenshotUrl: appointment.payment?.screenshotUrl || null,
        proofUrl: appointment.payment?.screenshotUrl || null,
      },

      afterServicePhotoUrl:
        appointment.afterServicePhotos?.[0]?.imageUrl || null,

      afterServicePhotos: appointment.afterServicePhotos.map((photo) => ({
        id: photo.id,
        imageUrl: photo.imageUrl,
        createdAt: photo.createdAt.toISOString(),
      })),

      status: appointment.status,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET BARBER APPOINTMENTS ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch barber appointments',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}