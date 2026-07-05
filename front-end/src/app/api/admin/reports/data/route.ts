import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { getAdminUser } from '@/lib/supabase/getUser';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAdminUser()
    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
  }

  const startDate = new Date(from);
  const endDate = new Date(to);
  endDate.setHours(23, 59, 59, 999);

  // All non-cancelled sales in range (for completion rate denominator)
  const allSales = await db.sale.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    },
  });

  // Paid (completed/fulfilled) sales
  const sales = await db.sale.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: 'PAID',
    },
    include: {
      items: { include: { service: true } },
      payment: true,
    },
  });

  // Total revenue from paid sales
  const totalRevenue = sales.reduce(
    (sum, s) => sum + Number(s.totalAmount), 0
  );

  const days = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const avgRevenuePerDay = Math.round(totalRevenue / days);

  // Completed = PAID sales only
  const completedTransactions = sales.length;
  const completionRate =
    allSales.length > 0
      ? Math.round((completedTransactions / allSales.length) * 100)
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

  // Weekly Revenue and Transaction Trend Breakdwon (BASED ON createdAt)
  const revdays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const useMonthly = revdays > 90; // switch to monthly if range > 3 months

  const weeklyMap: Record<string, { revenue: number; transactions: number }> = {};
  for (const sale of sales) {
    const d = new Date(sale.createdAt);
    let key: string;

    if (useMonthly) {
      key = d.toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g. "Jan 2026"
    } else {
      const dayDiff = Math.floor((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      key = `Week ${Math.floor(dayDiff / 7) + 1}`;
    }

    if (!weeklyMap[key]) weeklyMap[key] = { revenue: 0, transactions: 0 };
    weeklyMap[key].revenue += Number(sale.totalAmount);
    weeklyMap[key].transactions += 1;
  }

  const weeklyData = Object.entries(weeklyMap)
  .sort(([a], [b]) => {
    // works for both "Week 1" and "Jan 2026" formats
    if (a.startsWith('Week')) return parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]);
    return new Date(a).getTime() - new Date(b).getTime();
  })
  .map(([week, v]) => ({ week, ...v }));

  // Calculate previous period of same length
  const periodMs = endDate.getTime() - startDate.getTime();
  const prevStart = new Date(startDate.getTime() - periodMs);
  const prevEnd = new Date(startDate.getTime() - 1);

  const prevSales = await db.sale.findMany({
    where: {
      createdAt: { gte: prevStart, lte: prevEnd },
      status: 'PAID',
    },
  });

  const prevAllSales = await db.sale.findMany({
    where: {
      createdAt: { gte: prevStart, lte: prevEnd },
      status: { not: 'CANCELLED' },
    },
  });

  const prevRevenue = prevSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const prevCount = prevSales.length;
  const prevDays = Math.max(1, Math.ceil(periodMs / (1000 * 60 * 60 * 24)));
  const prevAvgPerDay = Math.round(prevRevenue / prevDays);
  const prevRate = prevAllSales.length > 0 ? Math.round((prevCount / prevAllSales.length) * 100) : 0;

  const calcTrend = (current: number, previous: number) =>
    previous === 0 ? 0 : Math.round(((current - previous) / previous) * 100);

  const revenueTrend = calcTrend(totalRevenue, prevRevenue);
  const avgTrend = calcTrend(avgRevenuePerDay, prevAvgPerDay);
  const apptTrend = calcTrend(completedTransactions, prevCount);
  const rateTrend = calcTrend(completionRate, prevRate);

  // Group paid sales by date
  const dailyMap = new Map<string, { revenue: number; transactions: number }>();
  sales
    .filter((s: any) => s.status === 'PAID')
    .forEach((sale: any) => {
      const date = toISO(new Date(sale.createdAt)); // "2026-06-18"
      if (!dailyMap.has(date)) dailyMap.set(date, { revenue: 0, transactions: 0 });
      const entry = dailyMap.get(date)!;
      entry.revenue += Number(sale.totalAmount ?? 0);
      entry.transactions += 1;
    });

  const dailyRevenue = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    totalRevenue,
    avgRevenuePerDay,
    completedTransactions,
    completionRate,
    weeklyData,
    services,
    totalSales: allSales.length,
    revenueTrend,
    avgTrend,
    apptTrend,
    rateTrend,
    dailyRevenue,
  });
}