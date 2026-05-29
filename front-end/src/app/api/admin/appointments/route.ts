import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function GET() {
  try {
    const appointments = await db.appointment.findMany({
      include: {
        barber: true,
        customer: true,
      },
      orderBy: {
        appointmentDate: 'asc',
      },
    });

    const result = appointments.map((appointment) => ({
        id: appointment.id,
        appointmentDate: appointment.appointmentDate,
        barber: { 
          id: appointment.barber.id,
          name: [appointment.barber.firstName, appointment.barber.lastName].filter(Boolean).join(' '),
        },
        status: appointment.status,
        customer: {
            id: appointment.customer.id,
            customerCode: appointment.customer.customerCode,
            name: [appointment.customer.firstName, appointment.customer.lastName].filter(Boolean).join(' '),
        },
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}