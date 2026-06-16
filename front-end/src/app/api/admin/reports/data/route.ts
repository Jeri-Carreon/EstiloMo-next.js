// front-end/src/app/api/admin/reports/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
  }

  const startDate = new Date(from);
  const endDate = new Date(to);
  endDate.setHours(23, 59, 59, 999);

  // Completed appointments in range
  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: startDate, lte: endDate },
      status: 'COMPLETED',
    },
    include: {
      service: true,
      sale: {
        include: { payment: true },
      },
    },
  });

  // All appointments (for completion rate)
  const allAppointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    },
  });

  // Paid sales in range
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: 'PAID',
    },
    include: {
      items: { include: { service: true } },
      payment: true,
    },
  });

  // Total revenue from payments
  const payments = await prisma.payment.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: 'PAID',
    },
  });

  const totalRevenue = payments.reduce(
    (sum, p) => sum + Number(p.amount), 0
  );

  const days = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const avgRevenuePerDay = Math.round(totalRevenue / days);

  const completedAppointments = appointments.length;
  const completionRate =
    allAppointments.length > 0
      ? Math.round((completedAppointments / allAppointments.length) * 100)
      : 0;

  // Service breakdown
  const serviceMap: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      const svcName = item.service.name;
      if (!serviceMap[svcName]) {
        serviceMap[svcName] = { name: svcName, count: 0, revenue: 0 };
      }
      serviceMap[svcName].count += item.quantity;
      serviceMap[svcName].revenue += Number(item.subtotal);
    }
  }
  const services = Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue);

  // Weekly breakdown
  const weeklyMap: Record<string, { revenue: number; transactions: number }> = {};
  for (const payment of payments) {
    const d = new Date(payment.createdAt);
    const weekNum = Math.ceil(
      ((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1) / 7
    );
    const key = `Week ${weekNum}`;
    if (!weeklyMap[key]) weeklyMap[key] = { revenue: 0, transactions: 0 };
    weeklyMap[key].revenue += Number(payment.amount);
    weeklyMap[key].transactions += 1;
  }
  const weeklyData = Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({ week, ...v }));

  return NextResponse.json({
    totalRevenue,
    avgRevenuePerDay,
    completedAppointments,
    completionRate,
    weeklyData,
    services,
    appointmentCount: allAppointments.length,
  });
}