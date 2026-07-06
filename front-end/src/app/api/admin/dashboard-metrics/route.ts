// app/api/admin/dashboard-metrics/route.ts
//
// Single source of truth for owner-dashboard analytics. Both the Next.js
// web dashboard and the Kotlin mobile app should call this endpoint and
// render the response directly — no client-side filtering/aggregation.
//
// GET /api/admin/dashboard-metrics?period=Day|Week|Month
//
// ─── Why this exists ───────────────────────────────────────────────────────
// The web and mobile apps previously duplicated period-filtering and
// aggregation logic independently, which drifted (e.g. 11 vs 12 "completed
// appointments") due to timezone handling differences between platforms.
// This endpoint computes everything once, in one timezone policy, so both
// clients always see identical numbers.
//
// ─── Timezone policy ───────────────────────────────────────────────────────
// All period boundaries (Day/Week/Month) and hour-of-day bucketing are
// computed in Asia/Manila (GMT+8), regardless of what timezone the server
// process itself runs in. This matters because `appointmentDate`/`createdAt`
// are Postgres timestamps — if the server happens to run in UTC (e.g. most
// hosting platforms), using plain `.getDate()`/`.getHours()` would silently
// shift appointments across day boundaries depending on where this is
// deployed. We instead explicitly shift into Manila wall-clock time before
// reading any date/hour components.
//
// If your `appointmentDate` values are stored as already-Manila-local wall
// clock time written with no UTC conversion (e.g. "2026-07-30T16:00:00" with
// no `Z`, meant literally as 4pm local, not 4pm UTC), set
// APPOINTMENT_DATES_ARE_NAIVE_LOCAL = true below. If they're stored as true
// UTC instants (properly converted on write), set it to false. Check one
// known appointment's raw DB value against what a human entered to confirm
// which case you're in — this single flag is the actual fix for the
// "11 vs 12" bug you were chasing.

import { NextRequest, NextResponse } from "next/server";
import { SaleSource, SaleStatus, AppointmentStatus, PaymentMethod } from "@prisma/client";
import { db as prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const MANILA_OFFSET_MINUTES = 8 * 60;

// Set based on how appointmentDate/createdAt are actually written to the DB.
// See note above.
const APPOINTMENT_DATES_ARE_NAIVE_LOCAL = false;

type Period = "Day" | "Week" | "Month";

// ─── Timezone helpers ───────────────────────────────────────────────────────

/**
 * Returns the Manila wall-clock representation of a Date as a plain object
 * of calendar/time fields, regardless of server host timezone.
 */
function toManilaParts(date: Date) {
  const utcMs = date.getTime();
  const shiftedMs = APPOINTMENT_DATES_ARE_NAIVE_LOCAL
    ? utcMs // already naive/local — no conversion, read UTC getters directly
    : utcMs + MANILA_OFFSET_MINUTES * 60 * 1000; // true UTC instant — shift into Manila

  const shifted = new Date(shiftedMs);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    // epoch days since 1970-01-01, in Manila calendar terms — used for week math
    epochDay: Math.floor(shiftedMs / (1000 * 60 * 60 * 24)),
    dayOfWeek: shifted.getUTCDay(), // 0 = Sunday
  };
}

function isInPeriod(date: Date, now: Date, period: Period): boolean {
  const d = toManilaParts(date);
  const n = toManilaParts(now);

  if (period === "Day") {
    return d.year === n.year && d.month === n.month && d.date === n.date;
  }
  if (period === "Week") {
    const startEpochDay = n.epochDay - n.dayOfWeek; // back up to Sunday
    const endEpochDay = startEpochDay + 6;
    return d.epochDay >= startEpochDay && d.epochDay <= endEpochDay;
  }
  // Month
  return d.year === n.year && d.month === n.month;
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

// ─── Auth ───────────────────────────────────────────────────────────────────
// Mirrors the exact auth pattern used by /api/user/role.
async function requireOwnerOrReceptionist(req: NextRequest): Promise<{ ok: true } | { ok: false; status: number }> {
  const supabase = await createClient();
  const authHeader = req.headers.get("authorization");
  let user = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    user = data?.user;
  } else {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  }

  if (!user) return { ok: false, status: 401 };

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { role: true },
  });

  if (!dbUser || !["OWNER", "RECEPTIONIST"].includes(dbUser.role)) {
    return { ok: false, status: 403 };
  }
  return { ok: true };
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireOwnerOrReceptionist(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  const periodParam = req.nextUrl.searchParams.get("period");
  const period: Period = periodParam === "Week" || periodParam === "Month" ? periodParam : "Day";
  const now = new Date();

  try {
    // Fetch everything needed once. Both Day/Week/Month share the same
    // underlying rows since Visit Frequency / Top Customers are computed
    // over ALL-time data regardless of the selected period.
    const [appointments, sales] = await Promise.all([
      prisma.appointment.findMany({
        select: {
          id: true,
          appointmentCode: true,
          appointmentDate: true,
          status: true,
          startMinutes: true,
          saleId: true,
        },
      }),
      prisma.sale.findMany({
        select: {
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
        },
      }),
    ]);

    // ── Appointments filtered by appointmentDate (period-scoped) ──
    const filteredAppts = appointments.filter((a) => isInPeriod(a.appointmentDate, now, period));

    const scheduledAppointments = filteredAppts.filter((a) => a.status === AppointmentStatus.SCHEDULED).length;
    const cancellationsAppointments = filteredAppts.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
    const noShows = filteredAppts.filter((a) => a.status === AppointmentStatus.NOSHOW).length;

    // ── Sales filtered: WALKIN by createdAt, BOOKING by linked appointment dates ──
    const filteredSales = sales.filter((sale) => {
      if (sale.source === SaleSource.WALKIN) {
        return isInPeriod(sale.createdAt, now, period);
      }
      const apptDates = sale.appointments.map((a) => a.appointmentDate);
      if (apptDates.length === 0) {
        return isInPeriod(sale.createdAt, now, period); // safety fallback
      }
      return apptDates.some((d) => isInPeriod(d, now, period));
    });

    const paidSales = filteredSales.filter((s) => s.status === SaleStatus.PAID);

    const todaySales = paidSales.reduce((total, sale) => total + Number(sale.totalAmount ?? 0), 0);

    const completedAppointments = filteredSales.filter(
      (s) => s.status === SaleStatus.PAID && s.source === SaleSource.BOOKING
    ).length;
    const completedTransactions = filteredSales.filter((s) => s.status === SaleStatus.PAID).length;

    // Cancelled transactions: a PARTIAL sale whose linked appointment(s) were cancelled.
    // (This replaces the web app's old `a.sale?.status` check, which referenced a
    // field that doesn't exist on Sale and always evaluated to false.)
    const cancellationsTotal = filteredSales.filter(
      (s) => s.status === SaleStatus.PARTIAL && s.appointments.some((a) => a.status === AppointmentStatus.CANCELLED)
    ).length;

    const walkInSalesPaid = paidSales.filter((s) => s.source === SaleSource.WALKIN);
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

    // Revenue by service (from paid sales' line items)
    const serviceMap = new Map<string, { service: string; revenue: number; count: number }>();
    paidSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const serviceName = item.service?.name ?? "Unknown";
        const amount = Number(item.subtotal ?? 0);
        if (!serviceMap.has(serviceName)) {
          serviceMap.set(serviceName, { service: serviceName, revenue: 0, count: 0 });
        }
        const e = serviceMap.get(serviceName)!;
        e.revenue += amount;
        e.count += Number(item.quantity ?? 1);
      });
    });
    const revenueByService = Array.from(serviceMap.values());

    // Revenue by barber (attributes each paid sale's totalAmount to its barber)
    const barberMap = new Map<string, { name: string; revenue: number; services: number }>();
    paidSales.forEach((sale) => {
      const barberName = sale.barber ? fullName(sale.barber.firstName, sale.barber.lastName) : "Unknown";
      const amount = Number(sale.totalAmount ?? 0);
      const itemCount = sale.items.reduce((s, i) => s + Number(i.quantity ?? 1), 0);
      if (!barberMap.has(barberName)) {
        barberMap.set(barberName, { name: barberName, revenue: 0, services: 0 });
      }
      const e = barberMap.get(barberName)!;
      e.revenue += amount;
      e.services += itemCount;
    });
    const revenueByBarber = Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Payment methods
    const gcashCount = paidSales.filter((s) => s.payment?.method === PaymentMethod.GCASH).length;
    const cashCount = paidSales.filter((s) => s.payment?.method === PaymentMethod.CASH).length;
    const totalPayments = gcashCount + cashCount;
    const paymentMethods = totalPayments
      ? [
          { method: "GCASH", percentage: Math.round((gcashCount / totalPayments) * 100) },
          { method: "CASH", percentage: Math.round((cashCount / totalPayments) * 100) },
        ]
      : [];

    // Peak hours: completed appointments (by start time) + paid walk-in sales (by createdAt)
    const hourMap = new Map<string, number>();

    filteredAppts.forEach((appt) => {
      if (appt.startMinutes == null || appt.status !== AppointmentStatus.COMPLETED) return;
      const h = Math.floor(appt.startMinutes / 60);
      const label = hourLabel(h);
      hourMap.set(label, (hourMap.get(label) ?? 0) + 1);
    });

    filteredSales
      .filter((s) => s.source === SaleSource.WALKIN && s.status === SaleStatus.PAID)
      .forEach((sale) => {
        const h = toManilaParts(sale.createdAt).hours;
        const label = hourLabel(h);
        hourMap.set(label, (hourMap.get(label) ?? 0) + 1);
      });

    const peakHours = Array.from(hourMap.entries())
      .map(([hour, customers]) => ({ hour, customers }))
      .sort((a, b) => hourLabelSortKey(a.hour) - hourLabelSortKey(b.hour));

    // Visit frequency — ALL-time paid sales, not period-scoped (long-term pattern)
    const customerVisits = new Map<string, Date[]>();
    sales
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
        gaps.push((sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24));
      }
      const avgGapDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      if (avgGapDays <= 10) frequencyBuckets.Weekly += 1;
      else if (avgGapDays <= 20) frequencyBuckets["Bi-weekly"] += 1;
      else if (avgGapDays <= 45) frequencyBuckets.Monthly += 1;
      else frequencyBuckets.Quarterly += 1;
    });
    const totalReturning = Object.values(frequencyBuckets).reduce((a, b) => a + b, 0);
    const visitFrequency = Object.entries(frequencyBuckets).map(([frequency, customers]) => ({
      frequency,
      customers,
      percentage: totalReturning ? Math.round((customers / totalReturning) * 100) : 0,
    }));

    // Top customers by revenue — ALL-time paid sales
    const customerRevenueMap = new Map<string, { name: string; visits: number; revenue: number }>();
    sales
      .filter((s) => s.status === SaleStatus.PAID)
      .forEach((sale) => {
        const key = sale.customer?.id ?? "unknown";
        const name = sale.customer ? fullName(sale.customer.firstName, sale.customer.lastName) : "Unknown";
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
      .map((c, i) => ({ rank: i + 1, ...c }));

    return NextResponse.json({
      period,
      todaySales,
      scheduledAppointments,
      completedAppointments,
      cancellationsAppointments,
      cancellationsTotal,
      completedTransactions,
      noShows,
      revenueByService,
      revenueByBarber,
      paymentMethods,
      walkInVsAppointments,
      peakHours,
      visitFrequency,
      topCustomers,
    });
  } catch (error) {
    console.error("[dashboard-metrics] error:", error);
    return NextResponse.json({ error: "Failed to compute dashboard metrics" }, { status: 500 });
  }
}