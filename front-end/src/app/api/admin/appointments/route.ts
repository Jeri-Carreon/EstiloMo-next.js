import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export async function GET() {
  try {
    const appointments = await db.appointment.findMany({
      include: {
        barber: true,
        customer: true,
        payment: true,
      },
      orderBy: {
        appointmentDate: 'asc',
      },
    });

    const result = appointments.map((appointment) => ({
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
        barber: { 
          id: appointment.barber.id,
          name: [appointment.barber.firstName, appointment.barber.lastName].filter(Boolean).join(' '),
        },
        payment: {
            id: appointment.payment?.id,
            amount: appointment.payment?.amount,
            downpayment: appointment.payment?.downPayment,
            method: appointment.payment?.method,
        },
        status: appointment.status,
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}