import { prisma } from "@/lib/prisma";
import { AppointmentStatus, SaleStatus, PaymentStatus } from "@prisma/client";

export async function buildBusinessContext() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOf7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOf30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    // --- Appointments ---
    todayAppointments,
    monthAppointments,
    last30DaysAppointments,

    // --- Sales ---
    monthSales,
    lastMonthSales,
    last30DaysSales,

    // --- Services ---
    topServices,
    allServices,

    // --- Barbers ---
    barberPerformance,

    // --- Customers ---
    totalCustomers,
    newCustomersThisMonth,
    regularCustomers,
    topCustomers,

    // --- Payments ---
    pendingPayments,
    paymentMethodBreakdown,

    // --- Reviews ---
    recentReviews,
    avgRating,

    // --- Loyalty ---
    loyaltyCardSettings,
    activeLoayltyCards,
  ] = await Promise.all([
    // Today's appointments
    prisma.appointment.findMany({
      where: { appointmentDate: { gte: startOfToday } },
      include: {
        customer: { select: { firstName: true, lastName: true, customerType: true } },
        barber: { select: { firstName: true, lastName: true } },
        service: { select: { name: true, price: true, category: true } },
      },
      orderBy: { startMinutes: "asc" },
    }),

    // This month's appointments
    prisma.appointment.groupBy({
      by: ["status"],
      where: { appointmentDate: { gte: startOfMonth } },
      _count: { id: true },
    }),

    // Last 30 days appointments breakdown
    prisma.appointment.findMany({
      where: { appointmentDate: { gte: startOf30DaysAgo } },
      select: {
        status: true,
        source: true,
        appointmentDate: true,
        service: { select: { name: true, price: true, category: true } },
        barber: { select: { firstName: true, lastName: true } },
      },
    }),

    // This month's sales
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        status: SaleStatus.PAID,
      },
      _sum: { totalAmount: true, discount: true },
      _count: { id: true },
      _avg: { totalAmount: true },
    }),

    // Last month's sales (for comparison)
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: SaleStatus.PAID,
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),

    // Last 30 days sales with items
    prisma.sale.findMany({
      where: {
        createdAt: { gte: startOf30DaysAgo },
        status: SaleStatus.PAID,
      },
      include: {
        items: {
          include: { service: { select: { name: true, category: true } } },
        },
        barber: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // Top services by bookings & revenue
    prisma.service.findMany({
      where: { isAvailable: true },
      orderBy: { totalBookings: "desc" },
      select: {
        name: true,
        category: true,
        price: true,
        totalBookings: true,
        totalRevenue: true,
        durationMinutes: true,
        isFeatured: true,
      },
      take: 10,
    }),

    // All services overview
    prisma.service.groupBy({
      by: ["category"],
      _count: { id: true },
      _sum: { totalRevenue: true, totalBookings: true },
    }),

    // Barber performance last 30 days
    prisma.barber.findMany({
      select: {
        firstName: true,
        lastName: true,
        appointments: {
          where: { appointmentDate: { gte: startOf30DaysAgo } },
          select: { status: true },
        },
        sales: {
          where: {
            createdAt: { gte: startOf30DaysAgo },
            status: SaleStatus.PAID,
          },
          select: { totalAmount: true },
        },
      },
    }),

    // Total customers
    prisma.customer.count({ where: { isActive: true } }),

    // New customers this month
    prisma.customer.count({
      where: { createdAt: { gte: startOfMonth }, isActive: true },
    }),

    // Regular vs casual
    prisma.customer.groupBy({
      by: ["customerType"],
      _count: { id: true },
    }),

    // Top customers by loyalty points
    prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { loyaltyPoints: "desc" },
      select: {
        firstName: true,
        lastName: true,
        customerType: true,
        loyaltyPoints: true,
      },
      take: 5,
    }),

    // Pending payments
    prisma.payment.aggregate({
      where: { status: PaymentStatus.PENDING },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // Payment method breakdown this month
    prisma.payment.groupBy({
      by: ["method"],
      where: {
        createdAt: { gte: startOfMonth },
        status: PaymentStatus.PAID,
      },
      _count: { id: true },
      _sum: { amount: true },
    }),

    // Recent reviews
    prisma.review.findMany({
      where: { createdAt: { gte: startOf30DaysAgo } },
      select: {
        rating: true,
        service: true,
        comment: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    // Average rating
    prisma.review.aggregate({
      where: { status: "COMPLETED", isVisible: true },
      _avg: { rating: true },
      _count: { id: true },
    }),

    // Loyalty settings
    prisma.loyaltyCardSetting.findFirst(),

    // Active loyalty cards
    prisma.loyaltyCard.count({ where: { status: "ACTIVE" } }),
  ]);

  // --- Derived Metrics ---
  const thisMonthRevenue = Number(monthSales._sum.totalAmount ?? 0);
  const lastMonthRevenue = Number(lastMonthSales._sum.totalAmount ?? 0);
  const revenueGrowth =
    lastMonthRevenue > 0
      ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : "N/A";

  const appointmentStatuses = monthAppointments.reduce(
    (acc, g) => ({ ...acc, [g.status]: g._count.id }),
    {} as Record<string, number>
  );
  const totalMonthAppts = Object.values(appointmentStatuses).reduce((a, b) => a + b, 0);
  const completionRate =
    totalMonthAppts > 0
      ? (((appointmentStatuses["COMPLETED"] ?? 0) / totalMonthAppts) * 100).toFixed(1)
      : "N/A";
  const noShowRate =
    totalMonthAppts > 0
      ? (((appointmentStatuses["NOSHOW"] ?? 0) / totalMonthAppts) * 100).toFixed(1)
      : "N/A";

  const barberSummary = barberPerformance.map((b) => ({
    name: `${b.firstName} ${b.lastName}`,
    completedAppointments: b.appointments.filter((a) => a.status === "COMPLETED").length,
    noShows: b.appointments.filter((a) => a.status === "NOSHOW").length,
    totalRevenue: b.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0).toFixed(2),
  }));

  return {
    generatedAt: now.toISOString(),
    summary: {
      revenue: {
        thisMonth: thisMonthRevenue.toFixed(2),
        lastMonth: lastMonthRevenue.toFixed(2),
        growthPercent: revenueGrowth,
        totalDiscountsThisMonth: Number(monthSales._sum.discount ?? 0).toFixed(2),
        avgTransactionValue: Number(monthSales._avg.totalAmount ?? 0).toFixed(2),
        totalTransactionsThisMonth: monthSales._count.id,
      },
      appointments: {
        todayCount: todayAppointments.length,
        todaySchedule: todayAppointments.map((a) => ({
          customer: `${a.customer.firstName} ${a.customer.lastName}`,
          customerType: a.customer.customerType,
          barber: `${a.barber.firstName} ${a.barber.lastName}`,
          service: a.service.name,
          price: a.service.price,
          startMinutes: a.startMinutes,
          status: a.status,
        })),
        thisMonthByStatus: appointmentStatuses,
        completionRatePercent: completionRate,
        noShowRatePercent: noShowRate,
      },
      customers: {
        total: totalCustomers,
        newThisMonth: newCustomersThisMonth,
        byType: regularCustomers.reduce(
          (acc, g) => ({ ...acc, [g.customerType]: g._count.id }),
          {} as Record<string, number>
        ),
        topByLoyaltyPoints: topCustomers,
        activeLoyaltyCards: activeLoayltyCards,
      },
      barbers: barberSummary,
      services: {
        topByBookings: topServices,
        byCategory: allServices,
      },
      payments: {
        pendingCount: pendingPayments._count.id,
        pendingAmount: Number(pendingPayments._sum.amount ?? 0).toFixed(2),
        thisMonthByMethod: paymentMethodBreakdown.map((p) => ({
          method: p.method,
          count: p._count.id,
          total: Number(p._sum.amount ?? 0).toFixed(2),
        })),
      },
      reviews: {
        averageRating: avgRating._avg.rating?.toFixed(1) ?? "N/A",
        totalReviews: avgRating._count.id,
        recentReviews: recentReviews,
      },
      loyalty: {
        settings: loyaltyCardSettings,
        activeCards: activeLoayltyCards,
      },
    },
    recentSales: last30DaysSales.slice(0, 20).map((s) => ({
      saleCode: s.saleCode,
      source: s.source,
      status: s.status,
      totalAmount: s.totalAmount,
      barber: s.barber ? `${s.barber.firstName} ${s.barber.lastName}` : "N/A",
      items: s.items.map((i) => ({
        service: i.service.name,
        category: i.service.category,
        quantity: i.quantity,
        price: i.price,
      })),
      createdAt: s.createdAt,
    })),
    recentAppointments: last30DaysAppointments.slice(0, 30),
  };
}