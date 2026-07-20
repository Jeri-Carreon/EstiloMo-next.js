// app/api/admin/dashboard-metrics/route.ts
//
// Single source of truth for admin-dashboard analytics.
//
// GET /api/admin/dashboard-metrics?period=Day|Week|Month
// GET /api/admin/dashboard-metrics?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD

import { NextRequest, NextResponse } from "next/server";
import {
  AppointmentStatus,
  PaymentMethod,
  Prisma,
  SaleSource,
  SaleStatus,
} from "@prisma/client";

import {
  DashboardDateRange,
  DashboardDateRangeError,
  DashboardPeriod,
  createDashboardTrendBuckets,
  getDashboardTrendBucketKey,
  isInDashboardRange,
  resolveDashboardDateRange,
  toDashboardDateTime,
} from "@/lib/dashboardDateRange";
import { db as prisma } from "@/lib/db";
import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";

const appointmentSelect = Prisma.validator<Prisma.AppointmentSelect>()({
  id: true,
  appointmentCode: true,
  appointmentDate: true,
  status: true,
  startMinutes: true,
  saleId: true,
});

const dashboardSaleSelect = Prisma.validator<Prisma.SaleSelect>()({
  id: true,
  saleCode: true,
  source: true,
  status: true,
  totalAmount: true,
  createdAt: true,
  appointments: {
    select: { id: true, appointmentDate: true, status: true },
  },
  items: {
    select: {
      quantity: true,
      subtotal: true,
      service: { select: { name: true } },
    },
  },
  payment: { select: { amount: true, method: true } },
  barber: { select: { firstName: true, lastName: true } },
  customer: { select: { id: true, firstName: true, lastName: true } },
});

const customerAnalyticsSaleSelect = Prisma.validator<Prisma.SaleSelect>()({
  status: true,
  totalAmount: true,
  createdAt: true,
  customer: { select: { id: true, firstName: true, lastName: true } },
});

type DashboardSale = Prisma.SaleGetPayload<{ select: typeof dashboardSaleSelect }>;
type CustomerAnalyticsSale = Prisma.SaleGetPayload<{
  select: typeof customerAnalyticsSaleSelect;
}>;

function parsePeriod(value: string | null): DashboardPeriod {
  if (value === "Week" || value === "Month" || value === "custom") {
    return value;
  }
  return "Day";
}

function saleRangeWhere(
  start: Date,
  end: Date,
  barberId?: string | null,
): Prisma.SaleWhereInput {
  const range = { gte: start, lte: end };
  const barberFilter = barberId
    ? {
        OR: [{ barberId }, { appointments: { some: { barberId } } }],
      }
    : {};

  return {
    AND: [
      barberFilter,
      {
        OR: [
          { source: SaleSource.WALKIN, createdAt: range },
          {
            source: { not: SaleSource.WALKIN },
            appointments: { some: { appointmentDate: range } },
          },
          {
            source: { not: SaleSource.WALKIN },
            appointments: { none: {} },
            createdAt: range,
          },
        ],
      },
    ],
  };
}

function hourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function hourLabelSortKey(label: string): number {
  const [n, p] = label.split(" ");
  const num = parseInt(n, 10);
  return (p === "AM" ? num % 12 : (num % 12) + 12) * 60;
}

function fullName(first?: string | null, last?: string | null, fallback = "Unknown"): string {
  const combined = [first ?? "", last ?? ""].filter(Boolean).join(" ");
  return combined || fallback;
}

function calcTrend(current: number, previous: number) {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function getSaleDashboardDate(sale: DashboardSale, range: DashboardDateRange) {
  if (sale.source === SaleSource.WALKIN) {
    return sale.createdAt;
  }

  const inRangeAppointment = sale.appointments
    .filter((appointment) =>
      isInDashboardRange(
        appointment.appointmentDate,
        range.currentStart,
        range.currentEnd,
      ),
    )
    .sort((a, b) => a.appointmentDate.getTime() - b.appointmentDate.getTime())[0];

  return inRangeAppointment?.appointmentDate ?? sale.createdAt;
}

function buildRevenueTrendData(paidSales: DashboardSale[], range: DashboardDateRange) {
  const buckets = createDashboardTrendBuckets(range);
  const bucketMap = new Map(
    buckets.map((bucket) => [
      bucket.key,
      { label: bucket.label, revenue: 0, transactions: 0 },
    ]),
  );

  paidSales.forEach((sale) => {
    const bucketKey = getDashboardTrendBucketKey(getSaleDashboardDate(sale, range), range);
    const bucket = bucketMap.get(bucketKey);
    if (!bucket) return;

    bucket.revenue += Number(sale.totalAmount ?? 0);
    bucket.transactions += 1;
  });

  return buckets.map((bucket) => ({
    ...bucketMap.get(bucket.key)!,
  }));
}

function appointmentWhere(dateRange: { gte: Date; lte: Date }, barberId?: string | null) {
  return barberId ? { appointmentDate: dateRange, barberId } : { appointmentDate: dateRange };
}

function reviewWhere(dateRange: { gte: Date; lte: Date }, barberId?: string | null) {
  if (!barberId) {
    return { createdAt: dateRange };
  }

  return {
    createdAt: dateRange,
    OR: [{ appointment: { barberId } }, { sale: { barberId } }],
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminTabAccess("dashboard", req);
  if (auth.status !== 200) {
    return adminAuthorizationResponse(auth.status);
  }

  const period = parsePeriod(req.nextUrl.searchParams.get("period"));
  const barberId = req.nextUrl.searchParams.get("barberId");
  let range: DashboardDateRange;

  try {
    range = resolveDashboardDateRange({
      period,
      from: req.nextUrl.searchParams.get("from"),
      to: req.nextUrl.searchParams.get("to"),
      fromTime: req.nextUrl.searchParams.get("fromTime"),
      toTime: req.nextUrl.searchParams.get("toTime"),
    });
  } catch (error) {
    if (error instanceof DashboardDateRangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  try {
    const currentSaleWhere = saleRangeWhere(range.currentStart, range.currentEnd, barberId);
    const previousSaleWhere = saleRangeWhere(
      range.previousStart,
      range.previousEnd,
      barberId,
    );
    const currentAppointmentDate = {
      gte: range.currentStart,
      lte: range.currentEnd,
    };
    const previousAppointmentDate = {
      gte: range.previousStart,
      lte: range.previousEnd,
    };
    const currentCreatedAt = {
      gte: range.currentStart,
      lte: range.currentEnd,
    };

    const [
      appointments,
      previousAppointments,
      sales,
      previousSales,
      allTimeCustomerSales,
      newCustomers,
      reviews,
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: appointmentWhere(currentAppointmentDate, barberId),
        select: appointmentSelect,
      }),
      prisma.appointment.findMany({
        where: appointmentWhere(previousAppointmentDate, barberId),
        select: { id: true, status: true },
      }),
      prisma.sale.findMany({
        where: currentSaleWhere,
        select: dashboardSaleSelect,
      }),
      prisma.sale.findMany({
        where: previousSaleWhere,
        select: { id: true, status: true, totalAmount: true, source: true },
      }),
      range.period === "custom"
        ? Promise.resolve(null)
        : prisma.sale.findMany({
            where: barberId
              ? {
                  status: SaleStatus.PAID,
                  OR: [{ barberId }, { appointments: { some: { barberId } } }],
                }
              : { status: SaleStatus.PAID },
            select: customerAnalyticsSaleSelect,
          }),
      barberId
        ? Promise.resolve(0)
        : prisma.customer.count({ where: { createdAt: currentCreatedAt } }),
      prisma.review.findMany({
        where: reviewWhere(currentCreatedAt, barberId),
        select: { id: true, rating: true, status: true },
      }),
    ]);

    const scheduledAppointments = appointments.filter(
      (a) => a.status === AppointmentStatus.SCHEDULED,
    ).length;
    const pendingAppointments = appointments.filter(
      (a) => a.status === AppointmentStatus.PENDING,
    ).length;
    const cancellationsAppointments = appointments.filter(
      (a) => a.status === AppointmentStatus.CANCELLED,
    ).length;
    const rejectedAppointments = appointments.filter(
      (a) => a.status === AppointmentStatus.REJECTED,
    ).length;
    const noShows = appointments.filter((a) => a.status === AppointmentStatus.NOSHOW).length;

    const paidSales = sales.filter((s) => s.status === SaleStatus.PAID);
    const todaySales = paidSales.reduce(
      (total, sale) => total + Number(sale.totalAmount ?? 0),
      0,
    );

    const completedAppointments = appointments.filter(
      (a) => a.status === AppointmentStatus.COMPLETED,
    ).length;
    const paidWalkInSales = paidSales.filter((s) => s.source === SaleSource.WALKIN);
    const completedTransactions = completedAppointments + paidWalkInSales.length;
    const nonCancelledAppointmentTransactions = appointments.filter(
      (a) =>
        a.status !== AppointmentStatus.CANCELLED &&
        a.status !== AppointmentStatus.REJECTED,
    ).length;
    const nonCancelledWalkInTransactions = sales.filter(
      (s) => s.source === SaleSource.WALKIN && s.status !== SaleStatus.CANCELLED,
    ).length;
    const nonCancelledTransactions =
      nonCancelledAppointmentTransactions + nonCancelledWalkInTransactions;
    const completionRate = nonCancelledTransactions
      ? Math.round((completedTransactions / nonCancelledTransactions) * 100)
      : 0;

    const cancellationsTotal = sales.filter(
      (s) =>
        s.status === SaleStatus.PARTIAL &&
        s.appointments.some((a) => a.status === AppointmentStatus.CANCELLED),
    ).length;

    const previousPaidSales = previousSales.filter((s) => s.status === SaleStatus.PAID);
    const previousRevenue = previousPaidSales.reduce(
      (total, sale) => total + Number(sale.totalAmount ?? 0),
      0,
    );
    const previousCompletedAppointments = previousAppointments.filter(
      (a) => a.status === AppointmentStatus.COMPLETED,
    ).length;
    const previousPaidWalkInSales = previousPaidSales.filter(
      (s) => s.source === SaleSource.WALKIN,
    );
    const previousCompletedTransactions =
      previousCompletedAppointments + previousPaidWalkInSales.length;
    const previousNonCancelledAppointmentTransactions = previousAppointments.filter(
      (a) =>
        a.status !== AppointmentStatus.CANCELLED &&
        a.status !== AppointmentStatus.REJECTED,
    ).length;
    const previousNonCancelledWalkInTransactions = previousSales.filter(
      (s) => s.source === SaleSource.WALKIN && s.status !== SaleStatus.CANCELLED,
    ).length;
    const previousNonCancelledTransactions =
      previousNonCancelledAppointmentTransactions + previousNonCancelledWalkInTransactions;
    const previousCompletionRate = previousNonCancelledTransactions
      ? Math.round((previousCompletedTransactions / previousNonCancelledTransactions) * 100)
      : 0;

    const walkInSalesPaid = paidWalkInSales;
    const bookedSalesPaid = paidSales.filter((s) => s.source !== SaleSource.WALKIN);
    const walkInVsAppointments = [
      {
        type: "Walk-in",
        customers: walkInSalesPaid.length,
        revenue: walkInSalesPaid.reduce((s, a) => s + Number(a.payment?.amount ?? 0), 0),
      },
      {
        type: "Appointments",
        customers: bookedSalesPaid.length,
        revenue: bookedSalesPaid.reduce((s, a) => s + Number(a.payment?.amount ?? 0), 0),
      },
    ];

    const serviceMap = new Map<string, { service: string; revenue: number; count: number }>();
    paidSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const serviceName = item.service?.name ?? "Unknown";
        const amount = Number(item.subtotal ?? 0);
        if (!serviceMap.has(serviceName)) {
          serviceMap.set(serviceName, { service: serviceName, revenue: 0, count: 0 });
        }
        const entry = serviceMap.get(serviceName)!;
        entry.revenue += amount;
        entry.count += Number(item.quantity ?? 1);
      });
    });
    const revenueByService = Array.from(serviceMap.values());

    const barberMap = new Map<string, { name: string; revenue: number; services: number }>();
    paidSales.forEach((sale) => {
      const barberName = sale.barber
        ? fullName(sale.barber.firstName, sale.barber.lastName)
        : "Unknown";
      const amount = Number(sale.totalAmount ?? 0);
      const itemCount = sale.items.reduce((s, i) => s + Number(i.quantity ?? 1), 0);
      if (!barberMap.has(barberName)) {
        barberMap.set(barberName, { name: barberName, revenue: 0, services: 0 });
      }
      const entry = barberMap.get(barberName)!;
      entry.revenue += amount;
      entry.services += itemCount;
    });
    const revenueByBarber = Array.from(barberMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    const gcashCount = paidSales.filter((s) => s.payment?.method === PaymentMethod.GCASH)
      .length;
    const cashCount = paidSales.filter((s) => s.payment?.method === PaymentMethod.CASH)
      .length;
    const totalPayments = gcashCount + cashCount;
    const paymentMethods = totalPayments
      ? [
          { method: "GCASH", percentage: Math.round((gcashCount / totalPayments) * 100) },
          { method: "CASH", percentage: Math.round((cashCount / totalPayments) * 100) },
        ]
      : [];

    const hourMap = new Map<string, number>();
    appointments.forEach((appt) => {
      if (appt.startMinutes == null || appt.status !== AppointmentStatus.COMPLETED) return;
      const label = hourLabel(Math.floor(appt.startMinutes / 60));
      hourMap.set(label, (hourMap.get(label) ?? 0) + 1);
    });

    sales
      .filter((s) => s.source === SaleSource.WALKIN && s.status === SaleStatus.PAID)
      .forEach((sale) => {
        const label = hourLabel(toDashboardDateTime(sale.createdAt).hour);
        hourMap.set(label, (hourMap.get(label) ?? 0) + 1);
      });

    const peakHours = Array.from(hourMap.entries())
      .map(([hour, customers]) => ({ hour, customers }))
      .sort((a, b) => hourLabelSortKey(a.hour) - hourLabelSortKey(b.hour));

    const customerAnalyticsSales: CustomerAnalyticsSale[] =
      range.period === "custom" ? paidSales : (allTimeCustomerSales ?? []);
    const uniqueCurrentCustomers = new Set(
      paidSales.map((sale) => sale.customer?.id).filter(Boolean),
    ).size;

    const customerVisits = new Map<string, Date[]>();
    customerAnalyticsSales
      .filter((s) => s.status === SaleStatus.PAID)
      .forEach((sale) => {
        const key = sale.customer?.id ?? "unknown";
        if (!customerVisits.has(key)) customerVisits.set(key, []);
        customerVisits.get(key)!.push(sale.createdAt);
      });

    const frequencyBuckets = { Weekly: 0, "Bi-weekly": 0, Monthly: 0, Quarterly: 0 };
    customerVisits.forEach((dates) => {
      if (dates.length < 2) return;
      const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        gaps.push((sorted[i].getTime() - sorted[i - 1].getTime()) / 86_400_000);
      }
      const avgGapDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      if (avgGapDays <= 10) frequencyBuckets.Weekly += 1;
      else if (avgGapDays <= 20) frequencyBuckets["Bi-weekly"] += 1;
      else if (avgGapDays <= 45) frequencyBuckets.Monthly += 1;
      else frequencyBuckets.Quarterly += 1;
    });
    const totalReturning = Object.values(frequencyBuckets).reduce((a, b) => a + b, 0);
    const visitFrequency = Object.entries(frequencyBuckets).map(
      ([frequency, customers]) => ({
        frequency,
        customers,
        percentage: totalReturning ? Math.round((customers / totalReturning) * 100) : 0,
      }),
    );

    const customerRevenueMap = new Map<
      string,
      { name: string; visits: number; revenue: number }
    >();
    customerAnalyticsSales
      .filter((s) => s.status === SaleStatus.PAID)
      .forEach((sale) => {
        const key = sale.customer?.id ?? "unknown";
        const name = sale.customer
          ? fullName(sale.customer.firstName, sale.customer.lastName)
          : "Unknown";
        if (!customerRevenueMap.has(key)) {
          customerRevenueMap.set(key, { name, visits: 0, revenue: 0 });
        }
        const entry = customerRevenueMap.get(key)!;
        entry.visits += 1;
        entry.revenue += Number(sale.totalAmount ?? 0);
      });
    const topCustomers = Array.from(customerRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((customer, index) => ({ rank: index + 1, ...customer }));

    const averageReviewRating = reviews.length
      ? Math.round(
          (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10,
        ) / 10
      : 0;

    return NextResponse.json({
      period: range.period,
      dateRange: {
        from: range.from,
        to: range.to,
        fromTime: range.fromTime,
        toTime: range.toTime,
        grouping: range.grouping,
        dayCount: range.dayCount,
      },
      todaySales,
      scheduledAppointments,
      pendingAppointments,
      cancellationsAppointments,
      rejectedAppointments,
      cancellationsTotal,
      completedAppointments,
      completedTransactions,
      completionRate,
      noShows,
      newCustomers: barberId ? uniqueCurrentCustomers : newCustomers,
      reviewsTotal: reviews.length,
      averageReviewRating,
      barberId: barberId ?? null,
      revenueByService,
      revenueByBarber,
      revenueTrendData: buildRevenueTrendData(paidSales, range),
      paymentMethods,
      walkInVsAppointments,
      peakHours,
      visitFrequency,
      topCustomers,
      trends: {
        revenue: calcTrend(todaySales, previousRevenue),
        appointments: calcTrend(appointments.length, previousAppointments.length),
        transactions: calcTrend(completedTransactions, previousCompletedTransactions),
        completionRate: calcTrend(completionRate, previousCompletionRate),
      },
    });
  } catch (error) {
    console.error("[dashboard-metrics] error:", error);
    return NextResponse.json(
      { error: "Failed to compute dashboard metrics" },
      { status: 500 },
    );
  }
}
