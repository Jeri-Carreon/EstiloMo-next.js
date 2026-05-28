import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

function createAppointmentCode() {
  return `APT-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    const cartItemsRaw = formData.get('cartItems');
    const paymentMethod = String(formData.get('paymentMethod') || 'GCASH');
    const downPayment = Number(formData.get('downPayment') || 200);

    if (!cartItemsRaw) {
      return NextResponse.json(
        { error: 'Missing cart items' },
        { status: 400 }
      );
    }

    const cartItems = JSON.parse(String(cartItemsRaw));

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: {
        email: session.user.email,
      },
      include: {
        customer: true,
      },
    });

    if (!user?.customer) {
      return NextResponse.json(
        { error: 'Customer profile not found' },
        { status: 404 }
      );
    }

    const createdAppointments = [];

    for (const item of cartItems) {
      const appointment = await db.appointment.create({
        data: {
          appointmentCode: createAppointmentCode(),
          customerId: user.customer.id,
          barberId: item.barberId,
          serviceId: item.serviceId,
          appointmentDate: new Date(item.appointmentDate),
          startMinutes: Number(item.startMinutes),
          endMinutes: Number(item.endMinutes),
          status: 'PENDING',
        },
      });

      await db.payment.create({
        data: {
          appointmentId: appointment.id,
          amount: Number(item.servicePrice),
          downPayment,
          method: paymentMethod === 'PAY_AT_SHOP' ? 'PAY_AT_SHOP' : 'GCASH',
          status: 'PENDING',
          screenshotUrl: null,
        },
      });

      createdAppointments.push(appointment);
    }

    return NextResponse.json({
      ok: true,
      appointments: createdAppointments,
    });
  } catch (error) {
    console.error('CONFIRM APPOINTMENT ERROR:', error);

    return NextResponse.json(
      { error: 'Failed to confirm appointment' },
      { status: 500 }
    );
  }
}