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

    const barber = await db.barber.findUnique({
      where: {
        id,
      },

      include: {
        schedules: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },

        appointments: {
          include: {
            barber: true,
            customer: true,
            payment: true,
            service: true,
          },

          orderBy: {
            appointmentDate: 'asc',
          },
        },
      },
    });

    const result = barber?.appointments.map((appointment) => ({
      id: appointment.id,
        appointmentCode: appointment.appointmentCode,
        customer: {
            id: appointment.customer.id,
            customerCode: appointment.customer.customerCode,
            name: [appointment.customer.firstName, appointment.customer.lastName].filter(Boolean).join(' '),
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
          })} ${minutesToTime(appointment.startMinutes)} - ${minutesToTime(appointment.endMinutes)}`,
        },
        service: {
          id: appointment.service.id,
          name: appointment.service.name,
        },
        barber: { 
          id: appointment.barber.id,
          name: [appointment.barber.firstName, appointment.barber.lastName].filter(Boolean).join(' '),
        },
        payment: {
            id: appointment.payment?.id,
            amount: appointment.payment?.amount,
            downpayment: appointment.payment?.downPayment,
            method: appointment.payment?.method,
            proofUrl: appointment.payment?.screenshotUrl,
        },

        status: appointment.status,
    }));

    if (!barber) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Barber not found',
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch barber',
      },
      {
        status: 500,
      }
    );
  }
}