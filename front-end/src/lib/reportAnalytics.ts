import {
  AppointmentStatus,
  PaymentStatus,
  ReviewStatus,
  SaleStatus,
} from "@prisma/client";

import { db } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_THRESHOLD_DAYS = 90;

type DateRangeInput = {
  startDate: Date;
  endDate: Date;
  dateRangeLabel: string;
};

type TrendPoint = {
  period: string;
  revenue?: number;
  transactions?: number;
  appointments?: number;
};

type TopService = {
  name: string;
  appointmentCount: number;
  revenueGenerated: number;
};

type TopBarber = {
  name: string;
  completedAppointments: number;
  generatedRevenue: number;
};

export type AIReportAnalytics = {
  reportPeriod: {
    dateFrom: string;
    dateTo: string;
    dateRange: string;
    days: number;
    comparisonDateFrom: string;
    comparisonDateTo: string;
    trendGranularity: "weekly" | "monthly";
  };
  financial: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
    avgRevenuePerDay: number;
    totalDiscounts: number;
    averageRevenuePerAppointment: number;
  };
  appointments: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    rejectedAppointments: number;
    noShowAppointments: number;
    appointmentCompletionRate: number;
  };
  customers: {
    newCustomers: number;
    returningCustomers: number;
    totalCustomersServed: number;
  };
  reviews: {
    averageRating: number | null;
    totalReviews: number;
  };
  services: {
    topServices: TopService[];
  };
  barbers: {
    topBarbers: TopBarber[];
  };
  trends: {
    weeklyRevenue: TrendPoint[];
    monthlyRevenue: TrendPoint[];
    weeklyAppointments: TrendPoint[];
    monthlyAppointments: TrendPoint[];
  };
  comparisons: {
    revenue: {
      current: number;
      previous: number;
      percentChange: number;
    };
    appointments: {
      current: number;
      previous: number;
      percentChange: number;
    };
    averageRevenuePerDay: {
      current: number;
      previous: number;
      percentChange: number;
    };
    completionRate: {
      current: number;
      previous: number;
      percentChange: number;
    };
  };
  dashboardKpis: {
    paidSalesBySource: {
      source: string;
      transactions: number;
      revenue: number;
    }[];
    paidPaymentsByMethod: {
      method: string;
      count: number;
      amount: number;
    }[];
    pendingPayments: {
      count: number;
      amount: number;
    };
  };
};

type Bucket = {
  period: string;
  sortKey: number;
  revenue: number;
  transactions: number;
  appointments: number;
};

function roundNumber(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(startDate: Date, endDate: Date): number {
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime() + 1) / DAY_MS));
}

function buildPreviousPeriod(startDate: Date, endDate: Date) {
  const periodMs = endDate.getTime() - startDate.getTime() + 1;
  const previousEnd = new Date(startDate.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - periodMs + 1);

  return { previousStart, previousEnd };
}

function percentChange(current: number, previous: number): number {
  if (!previous) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function fullName(first?: string | null, last?: string | null, fallback = "Unknown"): string {
  const name = [first ?? "", last ?? ""].filter(Boolean).join(" ").trim();
  return name || fallback;
}

function getBucket(date: Date, startDate: Date, useMonthly: boolean) {
  if (useMonthly) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return {
      period: `${year}-${String(month).padStart(2, "0")}`,
      sortKey: year * 100 + month,
    };
  }

  const week = Math.floor((date.getTime() - startDate.getTime()) / DAY_MS / 7) + 1;
  return {
    period: `Week ${week}`,
    sortKey: week,
  };
}

function compactRevenueTrends(
  sales: { createdAt: Date; totalAmount: unknown }[],
  startDate: Date,
  useMonthly: boolean,
): TrendPoint[] {
  const buckets = new Map<string, Bucket>();

  for (const sale of sales) {
    const bucket = getBucket(sale.createdAt, startDate, useMonthly);
    const existing =
      buckets.get(bucket.period) ??
      {
        period: bucket.period,
        sortKey: bucket.sortKey,
        revenue: 0,
        transactions: 0,
        appointments: 0,
      };

    existing.revenue += Number(sale.totalAmount ?? 0);
    existing.transactions += 1;
    buckets.set(bucket.period, existing);
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((bucket) => ({
      period: bucket.period,
      revenue: roundNumber(bucket.revenue),
      transactions: bucket.transactions,
    }));
}

function compactAppointmentTrends(
  appointments: { appointmentDate: Date }[],
  startDate: Date,
  useMonthly: boolean,
): TrendPoint[] {
  const buckets = new Map<string, Bucket>();

  for (const appointment of appointments) {
    const bucket = getBucket(appointment.appointmentDate, startDate, useMonthly);
    const existing =
      buckets.get(bucket.period) ??
      {
        period: bucket.period,
        sortKey: bucket.sortKey,
        revenue: 0,
        transactions: 0,
        appointments: 0,
      };

    existing.appointments += 1;
    buckets.set(bucket.period, existing);
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((bucket) => ({
      period: bucket.period,
      appointments: bucket.appointments,
    }));
}

function statusCount(
  groups: { status: AppointmentStatus; _count: { id: number } }[],
  status: AppointmentStatus,
) {
  return groups.find((group) => group.status === status)?._count.id ?? 0;
}

function totalStatusCount(groups: { _count: { id: number } }[]) {
  return groups.reduce((total, group) => total + group._count.id, 0);
}

export async function buildAIReportAnalytics({
  startDate,
  endDate,
  dateRangeLabel,
}: DateRangeInput): Promise<AIReportAnalytics> {
  const { previousStart, previousEnd } = buildPreviousPeriod(startDate, endDate);
  const days = daysBetween(startDate, endDate);
  const useMonthly = days > MONTH_THRESHOLD_DAYS;
  const paidSalesWhere = {
    createdAt: { gte: startDate, lte: endDate },
    status: SaleStatus.PAID,
  };
  const previousPaidSalesWhere = {
    createdAt: { gte: previousStart, lte: previousEnd },
    status: SaleStatus.PAID,
  };
  const appointmentWhere = {
    appointmentDate: { gte: startDate, lte: endDate },
  };
  const previousAppointmentWhere = {
    appointmentDate: { gte: previousStart, lte: previousEnd },
  };

  const [
    financial,
    previousFinancial,
    appointmentStatuses,
    previousAppointmentStatuses,
    reviewStats,
    newCustomers,
    servedCustomers,
    serviceGroups,
    barberRevenueGroups,
    completedAppointmentsByBarber,
    revenueTrendRows,
    appointmentTrendRows,
    paidSalesBySource,
    paidPaymentsByMethod,
    pendingPayments,
  ] = await Promise.all([
    db.sale.aggregate({
      where: paidSalesWhere,
      _sum: { totalAmount: true, discount: true },
      _avg: { totalAmount: true },
      _count: { id: true },
    }),
    db.sale.aggregate({
      where: previousPaidSalesWhere,
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    db.appointment.groupBy({
      by: ["status"],
      where: appointmentWhere,
      _count: { id: true },
    }),
    db.appointment.groupBy({
      by: ["status"],
      where: previousAppointmentWhere,
      _count: { id: true },
    }),
    db.review.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: ReviewStatus.COMPLETED,
        isVisible: true,
      },
      _avg: { rating: true },
      _count: { id: true },
    }),
    db.customer.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        isActive: true,
      },
    }),
    db.sale.findMany({
      where: paidSalesWhere,
      distinct: ["customerId"],
      select: { customerId: true },
    }),
    db.saleItem.groupBy({
      by: ["serviceId"],
      where: {
        sale: paidSalesWhere,
      },
      _sum: { quantity: true, subtotal: true },
    }),
    db.sale.groupBy({
      by: ["barberId"],
      where: {
        ...paidSalesWhere,
        barberId: { not: null },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    db.appointment.groupBy({
      by: ["barberId"],
      where: {
        ...appointmentWhere,
        status: AppointmentStatus.COMPLETED,
      },
      _count: { id: true },
    }),
    db.sale.findMany({
      where: paidSalesWhere,
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: "asc" },
    }),
    db.appointment.findMany({
      where: appointmentWhere,
      select: { appointmentDate: true },
      orderBy: { appointmentDate: "asc" },
    }),
    db.sale.groupBy({
      by: ["source"],
      where: paidSalesWhere,
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    db.payment.groupBy({
      by: ["method"],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: PaymentStatus.PAID,
      },
      _count: { id: true },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: PaymentStatus.PENDING,
      },
      _count: { id: true },
      _sum: { amount: true },
    }),
  ]);

  const servedCustomerIds = servedCustomers.map((customer) => customer.customerId);
  const returningCustomers = servedCustomerIds.length
    ? await db.sale.findMany({
        where: {
          customerId: { in: servedCustomerIds },
          status: SaleStatus.PAID,
          createdAt: { lt: startDate },
        },
        distinct: ["customerId"],
        select: { customerId: true },
      })
    : [];

  const serviceIds = serviceGroups.map((group) => group.serviceId);
  const services = serviceIds.length
    ? await db.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, name: true },
      })
    : [];
  const serviceNames = new Map(services.map((service) => [service.id, service.name]));

  const barberIds = Array.from(
    new Set([
      ...barberRevenueGroups.map((group) => group.barberId).filter(Boolean),
      ...completedAppointmentsByBarber.map((group) => group.barberId).filter(Boolean),
    ]),
  ) as string[];
  const barbers = barberIds.length
    ? await db.barber.findMany({
        where: { id: { in: barberIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const barberNames = new Map(
    barbers.map((barber) => [
      barber.id,
      fullName(barber.firstName, barber.lastName),
    ]),
  );
  const completedByBarber = new Map(
    completedAppointmentsByBarber.map((group) => [group.barberId, group._count.id]),
  );

  const totalRevenue = Number(financial._sum.totalAmount ?? 0);
  const previousRevenue = Number(previousFinancial._sum.totalAmount ?? 0);
  const totalTransactions = financial._count.id;
  const totalAppointments = totalStatusCount(appointmentStatuses);
  const previousTotalAppointments = totalStatusCount(previousAppointmentStatuses);
  const completedAppointments = statusCount(appointmentStatuses, AppointmentStatus.COMPLETED);
  const previousCompletedAppointments = statusCount(
    previousAppointmentStatuses,
    AppointmentStatus.COMPLETED,
  );
  const appointmentCompletionRate = totalAppointments
    ? roundNumber((completedAppointments / totalAppointments) * 100, 1)
    : 0;
  const previousCompletionRate = previousTotalAppointments
    ? roundNumber((previousCompletedAppointments / previousTotalAppointments) * 100, 1)
    : 0;
  const avgRevenuePerDay = roundNumber(totalRevenue / days);
  const previousAvgRevenuePerDay = roundNumber(previousRevenue / days);

  const topServices = serviceGroups
    .map((group) => ({
      name: serviceNames.get(group.serviceId) ?? "Unknown service",
      appointmentCount: Number(group._sum.quantity ?? 0),
      revenueGenerated: roundNumber(Number(group._sum.subtotal ?? 0)),
    }))
    .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
    .slice(0, 5);

  const topBarbers = barberRevenueGroups
    .map((group) => ({
      name: group.barberId
        ? barberNames.get(group.barberId) ?? "Unknown barber"
        : "Unknown barber",
      completedAppointments: group.barberId
        ? completedByBarber.get(group.barberId) ?? 0
        : 0,
      generatedRevenue: roundNumber(Number(group._sum.totalAmount ?? 0)),
    }))
    .sort((a, b) => b.generatedRevenue - a.generatedRevenue)
    .slice(0, 5);

  const revenueTrend = compactRevenueTrends(revenueTrendRows, startDate, useMonthly);
  const appointmentTrend = compactAppointmentTrends(appointmentTrendRows, startDate, useMonthly);

  return {
    reportPeriod: {
      dateFrom: toDateOnly(startDate),
      dateTo: toDateOnly(endDate),
      dateRange: dateRangeLabel,
      days,
      comparisonDateFrom: toDateOnly(previousStart),
      comparisonDateTo: toDateOnly(previousEnd),
      trendGranularity: useMonthly ? "monthly" : "weekly",
    },
    financial: {
      totalRevenue: roundNumber(totalRevenue),
      totalTransactions,
      averageTransactionValue: roundNumber(Number(financial._avg.totalAmount ?? 0)),
      avgRevenuePerDay,
      totalDiscounts: roundNumber(Number(financial._sum.discount ?? 0)),
      averageRevenuePerAppointment: completedAppointments
        ? roundNumber(totalRevenue / completedAppointments)
        : 0,
    },
    appointments: {
      totalAppointments,
      completedAppointments,
      cancelledAppointments: statusCount(appointmentStatuses, AppointmentStatus.CANCELLED),
      rejectedAppointments: statusCount(appointmentStatuses, AppointmentStatus.REJECTED),
      noShowAppointments: statusCount(appointmentStatuses, AppointmentStatus.NOSHOW),
      appointmentCompletionRate,
    },
    customers: {
      newCustomers,
      returningCustomers: returningCustomers.length,
      totalCustomersServed: servedCustomers.length,
    },
    reviews: {
      averageRating:
        reviewStats._avg.rating === null
          ? null
          : roundNumber(Number(reviewStats._avg.rating), 1),
      totalReviews: reviewStats._count.id,
    },
    services: {
      topServices,
    },
    barbers: {
      topBarbers,
    },
    trends: {
      weeklyRevenue: useMonthly ? [] : revenueTrend,
      monthlyRevenue: useMonthly ? revenueTrend : [],
      weeklyAppointments: useMonthly ? [] : appointmentTrend,
      monthlyAppointments: useMonthly ? appointmentTrend : [],
    },
    comparisons: {
      revenue: {
        current: roundNumber(totalRevenue),
        previous: roundNumber(previousRevenue),
        percentChange: percentChange(totalRevenue, previousRevenue),
      },
      appointments: {
        current: totalAppointments,
        previous: previousTotalAppointments,
        percentChange: percentChange(totalAppointments, previousTotalAppointments),
      },
      averageRevenuePerDay: {
        current: avgRevenuePerDay,
        previous: previousAvgRevenuePerDay,
        percentChange: percentChange(avgRevenuePerDay, previousAvgRevenuePerDay),
      },
      completionRate: {
        current: appointmentCompletionRate,
        previous: previousCompletionRate,
        percentChange: percentChange(appointmentCompletionRate, previousCompletionRate),
      },
    },
    dashboardKpis: {
      paidSalesBySource: paidSalesBySource.map((source) => ({
        source: source.source,
        transactions: source._count.id,
        revenue: roundNumber(Number(source._sum.totalAmount ?? 0)),
      })),
      paidPaymentsByMethod: paidPaymentsByMethod.map((payment) => ({
        method: payment.method ?? "UNKNOWN",
        count: payment._count.id,
        amount: roundNumber(Number(payment._sum.amount ?? 0)),
      })),
      pendingPayments: {
        count: pendingPayments._count.id,
        amount: roundNumber(Number(pendingPayments._sum.amount ?? 0)),
      },
    },
  };
}
