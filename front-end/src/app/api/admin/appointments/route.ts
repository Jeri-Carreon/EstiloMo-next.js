import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

async function createAppointmentCode() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await db.appointment.count();

  return `APT-${today}-${String(count + 1).padStart(4, '0')}`;
}

export async function GET() {
  try {
    const appointments = await db.appointment.findMany({
      include: {
        barber: true,
        customer: true,
        payment: true,
        service: true,
        afterServicePhotos: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        appointmentDate: 'asc',
      },
    });

    const result = appointments.map((appointment) => ({
      id: appointment.id,
      appointmentCode: appointment.appointmentCode,
      customerId: appointment.customerId,
      barberId: appointment.barberId,
      serviceId: appointment.serviceId,
      appointmentDate: appointment.appointmentDate,
      startMinutes: appointment.startMinutes,
      endMinutes: appointment.endMinutes,

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
        amount: appointment.payment?.amount ?? appointment.service.price ?? 0,
        downPayment: appointment.payment?.downPayment ?? 150,
        method: appointment.payment?.method || 'GCASH',
        screenshotUrl: appointment.payment?.screenshotUrl || null,
        proofUrl: appointment.payment?.screenshotUrl || null,
      },

      afterServicePhotoUrl:
        appointment.afterServicePhotos?.[0]?.imageUrl || null,

      status: appointment.status,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching appointments:', error);

    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.email ||
      !['OWNER', 'RECEPTIONIST'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const {
      customerId,
      barberId,
      serviceId,
      appointmentDate,
      startMinutes,
      endMinutes,
    } = body;

    if (
      !customerId ||
      !barberId ||
      !serviceId ||
      !appointmentDate ||
      startMinutes === undefined ||
      endMinutes === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const parsedStartMinutes = Number(startMinutes);
    const parsedEndMinutes = Number(endMinutes);

    if (
      Number.isNaN(parsedStartMinutes) ||
      Number.isNaN(parsedEndMinutes) ||
      parsedEndMinutes <= parsedStartMinutes
    ) {
      return NextResponse.json(
        { error: 'Invalid appointment time' },
        { status: 400 }
      );
    }

    const appointment = await db.appointment.create({
      data: {
        appointmentCode: await createAppointmentCode(),
        customerId,
        barberId,
        serviceId,
        appointmentDate: new Date(appointmentDate),
        startMinutes: parsedStartMinutes,
        endMinutes: parsedEndMinutes,
        status: 'SCHEDULED',
      },
    });

    const service = await db.service.findUnique({
      where: {
        id: serviceId,
      },
      select: {
        price: true,
      },
    });

    await db.payment.create({
      data: {
        appointmentId: appointment.id,
        amount: Number(service?.price || 0),
        downPayment: 150,
        method: 'GCASH',
        status: 'PENDING',
        screenshotUrl: null,
      },
    });

    const completeAppointment = await db.appointment.findUnique({
      where: {
        id: appointment.id,
      },
      include: {
        customer: true,
        barber: true,
        service: true,
        payment: true,
        afterServicePhotos: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        appointment: completeAppointment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating appointment:', error);

    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}