import {
  AppointmentStatus,
  ReviewStatus,
  SaleSource,
  SaleStatus,
  Status,
  type Prisma,
} from "@prisma/client";

import { getVatRate } from "@/lib/appointmentSettings";
import { db } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_TYPES = [
  "summary",
  "sales",
  "appointments",
  "services",
  "barbers",
  "customers",
  "loyalty",
  "discounts",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportMetric = {
  label: string;
  value: string | number;
  numericValue?: number;
  changePercent?: number | null;
};

export type ReportChart = {
  title: string;
  type: "line" | "bar" | "pie";
  data: Record<string, string | number | null>[];
  xKey?: string;
  series: { key: string; label: string; kind?: "money" | "number" | "percent" }[];
};

export type ReportTable = {
  title: string;
  columns: { key: string; label: string; kind?: "money" | "number" | "percent" | "date" }[];
  rows: Record<string, string | number | null>[];
};

export type ReportAnalyticsResult = {
  reportType: ReportType;
  reportTitle: string;
  dateRange: string;
  reportPeriod: {
    dateFrom: string;
    dateTo: string;
    days: number;
    comparisonDateFrom: string;
    comparisonDateTo: string;
    granularity: "hourly" | "daily" | "weekly" | "monthly";
  };
  hasData: boolean;
  metrics: ReportMetric[];
  charts: ReportChart[];
  tables: ReportTable[];
  ai: {
    insight: string;
    recommendation: string;
    insights?: { icon: string; title: string; body: string }[];
    weeklyInsight?: string;
    serviceRecommendation?: string;
  };
  csv: { filename: string; columns: string[]; rows: (string | number | null)[][] };
  notes: string[];
  sourceData: {
    revenueDefinition: string;
    customerDefinition: string;
    barberAttribution: string;
    paymentMethodDefinition: string;
    currentVatRate: number;
  };
  legacySummary: {
    totalRevenue: number;
    avgRevenuePerDay: number;
    completedTransactions: number;
    completionRate: number;
    revenueTrend: number | null;
    avgTrend: number | null;
    apptTrend: number | null;
    rateTrend: number | null;
    weeklyData: { week: string; revenue: number; transactions: number }[];
    services: { name: string; count: number; revenue: number }[];
    dailyRevenue: { date: string; revenue: number; transactions: number }[];
  };
};

export type AIReportAnalytics = ReportAnalyticsResult;

type DateRangeInput = {
  startDate: Date;
  endDate: Date;
  dateRangeLabel: string;
  reportType?: string;
};

type SaleRow = Prisma.SaleGetPayload<{
  include: {
    customer: true;
    barber: true;
    payment: true;
    reviews: true;
    appointments: { include: { barber: true; service: true } };
    items: { include: { service: true } };
    LoyaltyCardActivity: true;
  };
}>;

export function isReportType(value: string): value is ReportType {
  return REPORT_TYPES.includes(value as ReportType);
}

function roundNumber(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function money(value: unknown): number {
  return roundNumber(Number(value ?? 0));
}

function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return roundNumber((numerator / denominator) * 100, 1);
}

function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return roundNumber(((current - previous) / previous) * 100, 1);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayStart(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function daysBetween(startDate: Date, endDate: Date): number {
  return Math.max(1, Math.ceil((dayStart(endDate).getTime() - dayStart(startDate).getTime() + 1) / DAY_MS));
}

function previousPeriod(startDate: Date, endDate: Date) {
  const days = daysBetween(startDate, endDate);
  const previousEnd = new Date(dayStart(startDate).getTime() - 1);
  const previousStart = new Date(dayStart(previousEnd).getTime() - (days - 1) * DAY_MS);
  previousStart.setHours(0, 0, 0, 0);
  previousEnd.setHours(23, 59, 59, 999);
  return { previousStart, previousEnd };
}

function fullName(first?: string | null, last?: string | null, fallback = "Unknown"): string {
  const value = [first ?? "", last ?? ""].filter(Boolean).join(" ").trim();
  return value || fallback;
}

function customerName(customer?: { firstName?: string | null; lastName?: string | null } | null) {
  return fullName(customer?.firstName, customer?.lastName, "Walk-in customer");
}

function getGranularity(days: number): "hourly" | "daily" | "weekly" | "monthly" {
  if (days <= 1) return "hourly";
  if (days <= 60) return "daily";
  if (days <= 180) return "weekly";
  return "monthly";
}

function bucketKey(date: Date, startDate: Date, granularity: ReportAnalyticsResult["reportPeriod"]["granularity"]) {
  if (granularity === "hourly") {
    return { label: `${String(date.getHours()).padStart(2, "0")}:00`, sort: date.getHours() };
  }
  if (granularity === "weekly") {
    const week = Math.floor((dayStart(date).getTime() - dayStart(startDate).getTime()) / DAY_MS / 7) + 1;
    return { label: `Week ${week}`, sort: week };
  }
  if (granularity === "monthly") {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return { label: `${year}-${String(month).padStart(2, "0")}`, sort: year * 100 + month };
  }
  return { label: toDateOnly(date), sort: dayStart(date).getTime() };
}

function buildTrend<T>(
  rows: T[],
  startDate: Date,
  granularity: ReportAnalyticsResult["reportPeriod"]["granularity"],
  getDate: (row: T) => Date,
  apply: (row: T, bucket: Record<string, number>) => void,
) {
  const buckets = new Map<string, Record<string, string | number>>();

  for (const row of rows) {
    const bucket = bucketKey(getDate(row), startDate, granularity);
    const existing = buckets.get(bucket.label) ?? { period: bucket.label, sort: bucket.sort };
    apply(row, existing as Record<string, number>);
    buckets.set(bucket.label, existing);
  }

  return Array.from(buckets.values())
    .sort((a, b) => Number(a.sort) - Number(b.sort))
    .map((row) => {
      const next = { ...row };
      delete next.sort;
      return next;
    });
}

function statusCounts<T extends string>(rows: { status: T }[]) {
  const counts = new Map<T, number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return counts;
}

function sourceValue(source: SaleSource | string | null | undefined) {
  return source === SaleSource.BOOKING ? "BOOKING" : "WALKIN";
}

function findInsight(data: ReportAnalyticsResult, titleIncludes: string) {
  return data.ai.insights?.find((item) =>
    item.title.toLowerCase().includes(titleIncludes.toLowerCase()),
  );
}

function makeCsv(filename: string, columns: string[], rows: Record<string, string | number | null>[], keys: string[]) {
  return { filename, columns, rows: rows.map((row) => keys.map((key) => row[key] ?? "")) };
}

async function loadContext(startDate: Date, endDate: Date) {
  const { previousStart, previousEnd } = previousPeriod(startDate, endDate);

  const paidSalesWhere = {
    createdAt: { gte: startDate, lte: endDate },
    status: SaleStatus.PAID,
  };
  const previousPaidSalesWhere = {
    createdAt: { gte: previousStart, lte: previousEnd },
    status: SaleStatus.PAID,
  };

  const [
    currentVatRate,
    sales,
    allSales,
    previousSales,
    previousAllSales,
    appointments,
    previousAppointments,
    loyaltyCards,
    loyaltyActivities,
    settings,
    activeServices,
  ] = await Promise.all([
    getVatRate(),
    db.sale.findMany({
      where: paidSalesWhere,
      include: {
        customer: true,
        barber: true,
        payment: true,
        reviews: true,
        appointments: { include: { barber: true, service: true }, orderBy: { appointmentDate: "asc" } },
        items: { include: { service: true } },
        LoyaltyCardActivity: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.sale.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, status: { not: SaleStatus.CANCELLED } },
      select: { id: true, status: true },
    }),
    db.sale.findMany({
      where: previousPaidSalesWhere,
      select: { id: true, totalAmount: true, createdAt: true },
    }),
    db.sale.findMany({
      where: { createdAt: { gte: previousStart, lte: previousEnd }, status: { not: SaleStatus.CANCELLED } },
      select: { id: true, status: true },
    }),
    db.appointment.findMany({
      where: { appointmentDate: { gte: startDate, lte: endDate } },
      include: { customer: true, barber: true, service: true, sale: true, payment: true, review: true },
      orderBy: [{ appointmentDate: "asc" }, { startMinutes: "asc" }],
    }),
    db.appointment.findMany({
      where: { appointmentDate: { gte: previousStart, lte: previousEnd } },
      select: { id: true, status: true },
    }),
    db.loyaltyCard.findMany({
      include: { customer: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.loyaltyCardActivity.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { Customer: true, Sale: true, Appointment: true, Service: true },
      orderBy: { createdAt: "desc" },
    }),
    db.loyaltyCardSetting.findFirst({ orderBy: { updatedAt: "desc" } }),
    db.service.findMany({ where: { isAvailable: true }, select: { id: true, name: true } }),
  ]);

  return {
    currentVatRate,
    sales,
    allSales,
    previousSales,
    previousAllSales,
    appointments,
    previousAppointments,
    loyaltyCards,
    loyaltyActivities,
    settings,
    activeServices,
    previousStart,
    previousEnd,
  };
}

type LoadedContext = Awaited<ReturnType<typeof loadContext>>;

function baseResult(
  reportType: ReportType,
  title: string,
  input: DateRangeInput,
  ctx: LoadedContext,
  hasData: boolean,
): ReportAnalyticsResult {
  const days = daysBetween(input.startDate, input.endDate);
  return {
    reportType,
    reportTitle: title,
    dateRange: input.dateRangeLabel,
    reportPeriod: {
      dateFrom: toDateOnly(input.startDate),
      dateTo: toDateOnly(input.endDate),
      days,
      comparisonDateFrom: toDateOnly(ctx.previousStart),
      comparisonDateTo: toDateOnly(ctx.previousEnd),
      granularity: getGranularity(days),
    },
    hasData,
    metrics: [],
    charts: [],
    tables: [],
    ai: { insight: "", recommendation: "" },
    csv: { filename: `${reportType}-report.csv`, columns: [], rows: [] },
    notes: [],
    sourceData: {
      revenueDefinition: "Revenue is the sum of Sale.totalAmount for sales with status PAID in the selected period.",
      customerDefinition:
        "New customers have their first paid sale inside the selected period. Returning customers have a paid sale in the period and at least one paid sale before it.",
      barberAttribution:
        "Barber revenue is attributed to Sale.barberId when present; otherwise to the first linked appointment barber for paid booking sales.",
      paymentMethodDefinition:
        "Payment method analytics show amounts collected through Cash, GCash, and PayMongo/online payment flows for paid sales in the selected period. These collection totals are separate from total sales revenue.",
      currentVatRate: ctx.currentVatRate,
    },
    legacySummary: buildLegacySummary(input.startDate, ctx),
  };
}

function buildLegacySummary(startDate: Date, ctx: LoadedContext): ReportAnalyticsResult["legacySummary"] {
  const revenue = ctx.sales.reduce((sum, sale) => sum + money(sale.totalAmount), 0);
  const previousRevenue = ctx.previousSales.reduce((sum, sale) => sum + money(sale.totalAmount), 0);
  const days = daysBetween(ctx.sales[0]?.createdAt ?? startDate, ctx.sales.at(-1)?.createdAt ?? startDate);
  const reportDays = Math.max(1, daysBetween(startDate, ctx.sales.at(-1)?.createdAt ?? startDate));
  const avgRevenuePerDay = roundNumber(revenue / reportDays);
  const prevAvgRevenuePerDay = roundNumber(previousRevenue / Math.max(1, days));
  const completionRate = percent(ctx.sales.length, ctx.allSales.length);
  const previousCompletionRate = percent(ctx.previousSales.length, ctx.previousAllSales.length);
  const weeklyData = buildTrend(
    ctx.sales,
    startDate,
    getGranularity(daysBetween(startDate, ctx.sales.at(-1)?.createdAt ?? startDate)) === "monthly" ? "monthly" : "weekly",
    (sale) => sale.createdAt,
    (sale, bucket) => {
      bucket.revenue = roundNumber((bucket.revenue ?? 0) + money(sale.totalAmount));
      bucket.transactions = (bucket.transactions ?? 0) + 1;
    },
  ).map((row) => ({
    week: String(row.period),
    revenue: Number(row.revenue ?? 0),
    transactions: Number(row.transactions ?? 0),
  }));
  const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
  for (const sale of ctx.sales) {
    for (const item of sale.items) {
      const existing = serviceMap.get(item.serviceId) ?? { name: item.service.name, count: 0, revenue: 0 };
      existing.count += item.quantity;
      existing.revenue = roundNumber(existing.revenue + money(item.subtotal));
      serviceMap.set(item.serviceId, existing);
    }
  }
  const dailyRevenue = buildTrend(ctx.sales, startDate, "daily", (sale) => sale.createdAt, (sale, bucket) => {
    bucket.revenue = roundNumber((bucket.revenue ?? 0) + money(sale.totalAmount));
    bucket.transactions = (bucket.transactions ?? 0) + 1;
  }).map((row) => ({
    date: String(row.period),
    revenue: Number(row.revenue ?? 0),
    transactions: Number(row.transactions ?? 0),
  }));

  return {
    totalRevenue: roundNumber(revenue),
    avgRevenuePerDay,
    completedTransactions: ctx.sales.length,
    completionRate,
    revenueTrend: percentChange(revenue, previousRevenue),
    avgTrend: percentChange(avgRevenuePerDay, prevAvgRevenuePerDay),
    apptTrend: percentChange(ctx.sales.length, ctx.previousSales.length),
    rateTrend: percentChange(completionRate, previousCompletionRate),
    weeklyData,
    services: Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue),
    dailyRevenue,
  };
}

async function customerFirstSaleDates(customerIds: string[]) {
  if (!customerIds.length) return new Map<string, Date>();
  const rows = await db.sale.findMany({
    where: { customerId: { in: customerIds }, status: SaleStatus.PAID },
    select: { customerId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const map = new Map<string, Date>();
  for (const row of rows) {
    if (!map.has(row.customerId)) map.set(row.customerId, row.createdAt);
  }
  return map;
}

function buildSummary(input: DateRangeInput, ctx: LoadedContext, firstSaleDates: Map<string, Date>) {
  const result = baseResult("summary", "Summary Report", input, ctx, ctx.sales.length > 0 || ctx.appointments.length > 0);
  const revenue = result.legacySummary.totalRevenue;
  const bookingSales = ctx.sales.filter((sale) => sourceValue(sale.source) === "BOOKING");
  const walkinSales = ctx.sales.filter((sale) => sourceValue(sale.source) === "WALKIN");
  const bookingRevenue = roundNumber(bookingSales.reduce((sum, sale) => sum + money(sale.totalAmount), 0));
  const walkinRevenue = roundNumber(walkinSales.reduce((sum, sale) => sum + money(sale.totalAmount), 0));
  const customerIds = new Set(ctx.sales.map((sale) => sale.customerId));
  const newCustomers = Array.from(customerIds).filter((id) => {
    const first = firstSaleDates.get(id);
    return first && first >= input.startDate && first <= input.endDate;
  }).length;
  const returningCustomers = Array.from(customerIds).filter((id) => {
    const first = firstSaleDates.get(id);
    return first && first < input.startDate;
  }).length;
  const avgTransaction = ctx.sales.length ? roundNumber(revenue / ctx.sales.length) : 0;

  result.metrics = [
    { label: "Total Revenue", value: revenue, numericValue: revenue, changePercent: result.legacySummary.revenueTrend },
    { label: "Average Revenue Per Day", value: result.legacySummary.avgRevenuePerDay, numericValue: result.legacySummary.avgRevenuePerDay, changePercent: result.legacySummary.avgTrend },
    { label: "Completed Transactions", value: ctx.sales.length, numericValue: ctx.sales.length, changePercent: result.legacySummary.apptTrend },
    { label: "Average Transaction Value", value: avgTransaction, numericValue: avgTransaction },
    { label: "Completion Rate", value: result.legacySummary.completionRate, numericValue: result.legacySummary.completionRate, changePercent: result.legacySummary.rateTrend },
    { label: "New Customers", value: newCustomers, numericValue: newCustomers },
    { label: "Returning Customers", value: returningCustomers, numericValue: returningCustomers },
    { label: "Total Appointments", value: ctx.appointments.length, numericValue: ctx.appointments.length },
  ];
  result.charts = [
    {
      title: "Revenue and Transaction Trend",
      type: "line",
      data: result.legacySummary.weeklyData.map((row) => ({ period: row.week, revenue: row.revenue, transactions: row.transactions })),
      xKey: "period",
      series: [
        { key: "revenue", label: "Revenue", kind: "money" },
        { key: "transactions", label: "Transactions", kind: "number" },
      ],
    },
    {
      title: "Service Revenue Distribution",
      type: "pie",
      data: result.legacySummary.services.map((row) => ({ name: row.name, revenue: row.revenue, count: row.count })),
      xKey: "name",
      series: [{ key: "revenue", label: "Revenue", kind: "money" }],
    },
    {
      title: "Revenue by Source",
      type: "bar",
      data: [
        { source: "Booking", revenue: bookingRevenue, transactions: bookingSales.length },
        { source: "Walk-in", revenue: walkinRevenue, transactions: walkinSales.length },
      ],
      xKey: "source",
      series: [
        { key: "revenue", label: "Revenue", kind: "money" },
        { key: "transactions", label: "Transactions", kind: "number" },
      ],
    },
  ];
  result.tables = [
    {
      title: "Source Breakdown",
      columns: [
        { key: "source", label: "Source" },
        { key: "revenue", label: "Revenue", kind: "money" },
        { key: "transactions", label: "Transactions", kind: "number" },
        { key: "revenueShare", label: "Revenue Share", kind: "percent" },
      ],
      rows: [
        { source: "Booking", revenue: bookingRevenue, transactions: bookingSales.length, revenueShare: percent(bookingRevenue, revenue) },
        { source: "Walk-in", revenue: walkinRevenue, transactions: walkinSales.length, revenueShare: percent(walkinRevenue, revenue) },
      ],
    },
    {
      title: "Service Revenue Distribution",
      columns: [
        { key: "name", label: "Service" },
        { key: "count", label: "Count", kind: "number" },
        { key: "revenue", label: "Revenue", kind: "money" },
      ],
      rows: result.legacySummary.services,
    },
  ];
  result.ai.insight = revenue
    ? `${percent(bookingRevenue, revenue)}% of revenue came from booked appointments while ${percent(walkinRevenue, revenue)}% came from walk-in transactions.`
    : "No completed revenue was recorded for this period.";
  result.ai.recommendation = result.legacySummary.services[0]
    ? `Use ${result.legacySummary.services[0].name} as the anchor service for promotions because it currently leads service revenue.`
    : "No service-level recommendation is available without completed paid sales.";
  result.csv = makeCsv("summary-report.csv", ["metric", "value"], result.metrics.map((metric) => ({ metric: metric.label, value: metric.numericValue ?? metric.value })), ["metric", "value"]);
  return result;
}

type PaymentCollectionComponent = {
  method: "Cash" | "GCash" | "PayMongo / Online";
  amount: number;
};

function hasPayMongoReference(sale: SaleRow): boolean {
  const payment = sale.payment;
  return Boolean(
    payment?.paymongoCheckoutSessionId ||
      payment?.paymongoPaymentId ||
      payment?.paymongoPaymentIntentId ||
      payment?.paymongoCheckoutUrl,
  );
}

function getPaymentCollectionComponents(sale: SaleRow): PaymentCollectionComponent[] {
  const payment = sale.payment;
  if (!payment) return [];

  const total = money(sale.totalAmount);
  const downPayment = Math.min(money(payment.downPayment), total);
  const hasOnlineDownPayment =
    sale.source === SaleSource.BOOKING &&
    sale.downPaymentStatus === "PAID" &&
    downPayment > 0 &&
    hasPayMongoReference(sale);
  const components: PaymentCollectionComponent[] = [];
  const onlineAmount =
    hasOnlineDownPayment
      ? downPayment
      : hasPayMongoReference(sale) && !payment.method
        ? Math.min(money(payment.amount), total)
        : 0;

  if (onlineAmount > 0) {
    components.push({ method: "PayMongo / Online", amount: roundNumber(onlineAmount) });
  }

  if (payment.method === "CASH" || payment.method === "GCASH") {
    const remainingAfterOnline = Math.max(total - onlineAmount, 0);
    const collectedAmount = onlineAmount > 0
      ? remainingAfterOnline
      : Math.min(money(payment.amount), total);

    if (collectedAmount > 0) {
      components.push({
        method: payment.method === "CASH" ? "Cash" : "GCash",
        amount: roundNumber(collectedAmount),
      });
    }
  }

  return components;
}

function paymentMethodsLabel(sale: SaleRow): string {
  const labels = getPaymentCollectionComponents(sale).map((component) => component.method);
  return labels.length ? labels.join(" + ") : "Unspecified";
}

function buildPaymentMethodSummary(sales: SaleRow[]) {
  const map = new Map<string, { method: string; amount: number; count: number }>([
    ["Cash", { method: "Cash", amount: 0, count: 0 }],
    ["GCash", { method: "GCash", amount: 0, count: 0 }],
    ["PayMongo / Online", { method: "PayMongo / Online", amount: 0, count: 0 }],
  ]);

  for (const sale of sales) {
    for (const component of getPaymentCollectionComponents(sale)) {
      const row = map.get(component.method)!;
      row.amount = roundNumber(row.amount + component.amount);
      row.count += 1;
    }
  }

  const totalCollected = roundNumber(Array.from(map.values()).reduce((sum, row) => sum + row.amount, 0));
  return Array.from(map.values()).map((row) => ({
    ...row,
    share: percent(row.amount, totalCollected),
  }));
}

function buildSales(input: DateRangeInput, ctx: LoadedContext) {
  const result = baseResult("sales", "Sales Report", input, ctx, ctx.sales.length > 0);
  const revenue = result.legacySummary.totalRevenue;
  const totals = ctx.sales.reduce(
    (sum, sale) => {
      sum.subtotal += money(sale.subtotal);
      sum.discount += money(sale.discount);
      sum.vat += money(sale.vatAmount);
      return sum;
    },
    { subtotal: 0, discount: 0, vat: 0 },
  );
  const values = ctx.sales.map((sale) => money(sale.totalAmount));
  const bookingSales = ctx.sales.filter((sale) => sourceValue(sale.source) === "BOOKING");
  const walkinSales = ctx.sales.filter((sale) => sourceValue(sale.source) === "WALKIN");
  const bookingRevenue = roundNumber(bookingSales.reduce((sum, sale) => sum + money(sale.totalAmount), 0));
  const walkinRevenue = roundNumber(walkinSales.reduce((sum, sale) => sum + money(sale.totalAmount), 0));
  const paymentMethodSummary = buildPaymentMethodSummary(ctx.sales);
  const paymentByMethod = new Map(paymentMethodSummary.map((row) => [row.method, row]));
  const trend = buildTrend(ctx.sales, input.startDate, result.reportPeriod.granularity, (sale) => sale.createdAt, (sale, bucket) => {
    bucket.revenue = roundNumber((bucket.revenue ?? 0) + money(sale.totalAmount));
    bucket.transactions = (bucket.transactions ?? 0) + 1;
  });
  const rows = ctx.sales.map((sale) => {
    const components = getPaymentCollectionComponents(sale);
    const amountFor = (method: PaymentCollectionComponent["method"]) =>
      roundNumber(components.filter((component) => component.method === method).reduce((sum, component) => sum + component.amount, 0));

    return {
      date: toDateOnly(sale.createdAt),
      transactionCode: sale.saleCode,
      customer: customerName(sale.customer),
      source: sourceValue(sale.source),
      paymentMethods: paymentMethodsLabel(sale),
      subtotal: money(sale.subtotal),
      discount: money(sale.discount),
      vat: money(sale.vatAmount),
      total: money(sale.totalAmount),
      saleStatus: sale.status,
      status: sale.payment?.status ?? sale.status,
      cashCollected: amountFor("Cash"),
      gcashCollected: amountFor("GCash"),
      onlineCollected: amountFor("PayMongo / Online"),
    };
  });

  result.metrics = [
    { label: "Gross Sales / Revenue", value: revenue, numericValue: revenue, changePercent: result.legacySummary.revenueTrend },
    { label: "Completed Sales", value: ctx.sales.length, numericValue: ctx.sales.length },
    { label: "Average Transaction Value", value: ctx.sales.length ? roundNumber(revenue / ctx.sales.length) : 0 },
    { label: "Highest Transaction Value", value: values.length ? Math.max(...values) : 0 },
    { label: "Lowest Transaction Value", value: values.length ? Math.min(...values) : 0 },
    { label: "Booking Revenue", value: bookingRevenue, numericValue: bookingRevenue },
    { label: "Walk-in Revenue", value: walkinRevenue, numericValue: walkinRevenue },
    { label: "Booking Transaction Count", value: bookingSales.length, numericValue: bookingSales.length },
    { label: "Walk-in Transaction Count", value: walkinSales.length, numericValue: walkinSales.length },
    { label: "Total Discounts", value: roundNumber(totals.discount), numericValue: roundNumber(totals.discount) },
    { label: "Net Revenue after discounts", value: revenue, numericValue: revenue },
    { label: "VAT-exclusive subtotal", value: roundNumber(totals.subtotal), numericValue: roundNumber(totals.subtotal) },
    { label: "VAT amount", value: roundNumber(totals.vat), numericValue: roundNumber(totals.vat) },
    { label: "VAT-inclusive total", value: revenue, numericValue: revenue },
    { label: "Configured VAT rate", value: percent(ctx.currentVatRate, 1), numericValue: percent(ctx.currentVatRate, 1) },
    { label: "Cash Payments", value: `${paymentByMethod.get("Cash")?.count ?? 0} payments`, numericValue: paymentByMethod.get("Cash")?.amount ?? 0 },
    { label: "GCash Payments", value: `${paymentByMethod.get("GCash")?.count ?? 0} payments`, numericValue: paymentByMethod.get("GCash")?.amount ?? 0 },
    { label: "PayMongo / Online Payments", value: `${paymentByMethod.get("PayMongo / Online")?.count ?? 0} payments`, numericValue: paymentByMethod.get("PayMongo / Online")?.amount ?? 0 },
  ];
  result.charts = [
    { title: "Revenue over time", type: "line", data: trend, xKey: "period", series: [{ key: "revenue", label: "Revenue", kind: "money" }] },
    { title: "Transactions over time", type: "bar", data: trend, xKey: "period", series: [{ key: "transactions", label: "Transactions", kind: "number" }] },
    { title: "Walk-in vs Booking revenue", type: "bar", data: [{ source: "Booking", revenue: bookingRevenue }, { source: "Walk-in", revenue: walkinRevenue }], xKey: "source", series: [{ key: "revenue", label: "Revenue", kind: "money" }] },
    { title: "Walk-in vs Booking transaction count", type: "bar", data: [{ source: "Booking", transactions: bookingSales.length }, { source: "Walk-in", transactions: walkinSales.length }], xKey: "source", series: [{ key: "transactions", label: "Transactions", kind: "number" }] },
    { title: "Payments by Method", type: "bar", data: paymentMethodSummary, xKey: "method", series: [{ key: "amount", label: "Amount Collected", kind: "money" }] },
  ];
  result.tables = [
    { title: "Payment Method Summary", columns: [
      { key: "method", label: "Method" }, { key: "amount", label: "Amount Collected", kind: "money" }, { key: "count", label: "Payment Count", kind: "number" }, { key: "share", label: "Share of Collections", kind: "percent" },
    ], rows: paymentMethodSummary },
    { title: "Sales Breakdown", columns: [
      { key: "date", label: "Date", kind: "date" }, { key: "transactionCode", label: "Transaction Code" }, { key: "customer", label: "Customer" }, { key: "source", label: "Source" }, { key: "paymentMethods", label: "Payment Method(s)" }, { key: "subtotal", label: "Subtotal", kind: "money" }, { key: "discount", label: "Discount", kind: "money" }, { key: "vat", label: "VAT", kind: "money" }, { key: "total", label: "Total", kind: "money" }, { key: "saleStatus", label: "Sale Status" },
    ], rows },
  ];
  result.ai.insight = revenue ? `${sourceValue(bookingRevenue >= walkinRevenue ? SaleSource.BOOKING : SaleSource.WALKIN)} sales generated the larger revenue share in this period.` : "No paid sales were recorded for this period.";
  result.ai.recommendation = totals.discount > 0 ? "Review discounted transactions against revenue after discounts to confirm promotions are protecting margin." : "No discount pressure is visible in the completed sales for this period.";
  result.csv = makeCsv(
    "sales-report.csv",
    ["transactionCode", "date", "customer", "source", "subtotal", "discount", "vat", "total", "saleStatus", "paymentMethods", "cashCollected", "gcashCollected", "onlineCollected"],
    rows,
    ["transactionCode", "date", "customer", "source", "subtotal", "discount", "vat", "total", "saleStatus", "paymentMethods", "cashCollected", "gcashCollected", "onlineCollected"],
  );
  return result;
}

function buildAppointments(input: DateRangeInput, ctx: LoadedContext) {
  const result = baseResult("appointments", "Appointment Performance Report", input, ctx, ctx.appointments.length > 0);
  const counts = statusCounts(ctx.appointments);
  const total = ctx.appointments.length;
  const completed = counts.get(AppointmentStatus.COMPLETED) ?? 0;
  const cancelled = counts.get(AppointmentStatus.CANCELLED) ?? 0;
  const noShow = counts.get(AppointmentStatus.NOSHOW) ?? 0;
  const rejected = counts.get(AppointmentStatus.REJECTED) ?? 0;
  const pending = counts.get(AppointmentStatus.PENDING) ?? 0;
  const scheduled = counts.get(AppointmentStatus.SCHEDULED) ?? 0;
  const trendRows = buildTrend(ctx.appointments, input.startDate, result.reportPeriod.granularity, (appt) => appt.appointmentDate, (appt, bucket) => {
    bucket.total = (bucket.total ?? 0) + 1;
    bucket.completed = (bucket.completed ?? 0) + (appt.status === AppointmentStatus.COMPLETED ? 1 : 0);
    bucket.cancelled = (bucket.cancelled ?? 0) + (appt.status === AppointmentStatus.CANCELLED ? 1 : 0);
    bucket.noShow = (bucket.noShow ?? 0) + (appt.status === AppointmentStatus.NOSHOW ? 1 : 0);
  });
  const tableRows = trendRows.map((row) => ({
    date: String(row.period),
    total: Number(row.total ?? 0),
    completed: Number(row.completed ?? 0),
    cancelled: Number(row.cancelled ?? 0),
    noShow: Number(row.noShow ?? 0),
    completionRate: percent(Number(row.completed ?? 0), Number(row.total ?? 0)),
  }));
  result.metrics = [
    { label: "Total Appointments", value: total, numericValue: total },
    { label: "Scheduled", value: scheduled, numericValue: scheduled },
    { label: "Completed", value: completed, numericValue: completed },
    { label: "Cancelled", value: cancelled, numericValue: cancelled },
    { label: "No-show", value: noShow, numericValue: noShow },
    { label: "Rejected", value: rejected, numericValue: rejected },
    { label: "Pending", value: pending, numericValue: pending },
    { label: "Completion Rate", value: percent(completed, total), numericValue: percent(completed, total) },
    { label: "Cancellation Rate", value: percent(cancelled, total), numericValue: percent(cancelled, total) },
    { label: "No-show Rate", value: percent(noShow, total), numericValue: percent(noShow, total) },
  ];
  result.charts = [
    { title: "Appointment Status Distribution", type: "pie", data: Object.values(AppointmentStatus).map((status) => ({ status, count: counts.get(status) ?? 0 })).filter((row) => row.count > 0), xKey: "status", series: [{ key: "count", label: "Appointments", kind: "number" }] },
    { title: "Appointment Trend Over Time", type: "line", data: trendRows, xKey: "period", series: [{ key: "total", label: "Appointments", kind: "number" }] },
    { title: "Completion vs Cancellation vs No-show trend", type: "line", data: trendRows, xKey: "period", series: [{ key: "completed", label: "Completed", kind: "number" }, { key: "cancelled", label: "Cancelled", kind: "number" }, { key: "noShow", label: "No-show", kind: "number" }] },
  ];
  result.tables = [{ title: "Appointment Trend Table", columns: [
    { key: "date", label: "Date" }, { key: "total", label: "Total", kind: "number" }, { key: "completed", label: "Completed", kind: "number" }, { key: "cancelled", label: "Cancelled", kind: "number" }, { key: "noShow", label: "No-show", kind: "number" }, { key: "completionRate", label: "Completion Rate", kind: "percent" },
  ], rows: tableRows }];
  result.ai.insight = total ? `${completed} of ${total} appointments were completed, for a ${percent(completed, total)}% completion rate.` : "No appointments were scheduled in this period.";
  result.ai.recommendation = noShow > 0 ? "Review reminder timing for periods with no-show appointments and reinforce confirmations before those slots." : "No no-show appointments were recorded, so maintain the current appointment confirmation flow.";
  result.csv = makeCsv("appointments-report.csv", result.tables[0].columns.map((column) => column.label), tableRows, result.tables[0].columns.map((column) => column.key));
  return result;
}

function buildServices(input: DateRangeInput, ctx: LoadedContext) {
  const result = baseResult("services", "Service Performance Report", input, ctx, ctx.sales.some((sale) => sale.items.length > 0));
  const map = new Map<string, { service: string; count: number; revenue: number; trend: Map<string, number> }>();
  for (const sale of ctx.sales) {
    for (const item of sale.items) {
      const existing = map.get(item.serviceId) ?? { service: item.service.name, count: 0, revenue: 0, trend: new Map() };
      existing.count += item.quantity;
      existing.revenue = roundNumber(existing.revenue + money(item.subtotal));
      const bucket = bucketKey(sale.createdAt, input.startDate, result.reportPeriod.granularity).label;
      existing.trend.set(bucket, roundNumber((existing.trend.get(bucket) ?? 0) + money(item.subtotal)));
      map.set(item.serviceId, existing);
    }
  }
  const totalRevenue = roundNumber(Array.from(map.values()).reduce((sum, row) => sum + row.revenue, 0));
  const rows = Array.from(map.values())
    .map((row) => ({
      service: row.service,
      count: row.count,
      revenue: row.revenue,
      revenueShare: percent(row.revenue, totalRevenue),
      averageRevenue: row.count ? roundNumber(row.revenue / row.count) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .map((row, index, arr) => ({ ...row, revenueRank: index + 1, volumeRank: [...arr].sort((a, b) => b.count - a.count).findIndex((item) => item.service === row.service) + 1 }));
  const lowestActive = ctx.activeServices.map((svc) => rows.find((row) => row.service === svc.name) ?? { service: svc.name, count: 0, revenue: 0 }).sort((a, b) => a.revenue - b.revenue)[0];
  result.metrics = [
    { label: "Top Revenue Service", value: rows[0]?.service ?? "None" },
    { label: "Most Frequently Purchased Service", value: [...rows].sort((a, b) => b.count - a.count)[0]?.service ?? "None" },
    { label: "Lowest Performing Active Service", value: lowestActive?.service ?? "None" },
    { label: "Total Service Revenue", value: totalRevenue, numericValue: totalRevenue },
    { label: "Total Services Rendered", value: rows.reduce((sum, row) => sum + row.count, 0), numericValue: rows.reduce((sum, row) => sum + row.count, 0) },
  ];
  result.charts = [
    { title: "Revenue by Service", type: "bar", data: rows, xKey: "service", series: [{ key: "revenue", label: "Revenue", kind: "money" }] },
    { title: "Service Volume", type: "bar", data: rows, xKey: "service", series: [{ key: "count", label: "Volume", kind: "number" }] },
    { title: "Service Revenue Distribution", type: "pie", data: rows, xKey: "service", series: [{ key: "revenue", label: "Revenue", kind: "money" }] },
  ];
  result.tables = [{ title: "Service Performance", columns: [
    { key: "revenueRank", label: "Revenue Rank", kind: "number" }, { key: "volumeRank", label: "Volume Rank", kind: "number" }, { key: "service", label: "Service" }, { key: "count", label: "Completed", kind: "number" }, { key: "revenue", label: "Revenue", kind: "money" }, { key: "revenueShare", label: "Revenue Share", kind: "percent" }, { key: "averageRevenue", label: "Avg Revenue", kind: "money" },
  ], rows }];
  result.ai.insight = rows[0] ? `${rows[0].service} generated the largest service revenue share at ${rows[0].revenueShare}%.` : "No completed service revenue was recorded.";
  result.ai.recommendation = rows[0] ? `Promote complementary services alongside ${rows[0].service} to build on existing demand.` : "Wait for completed service data before making service mix decisions.";
  result.csv = makeCsv("services-report.csv", result.tables[0].columns.map((column) => column.label), rows, result.tables[0].columns.map((column) => column.key));
  return result;
}

function getSaleBarber(sale: SaleRow) {
  const barber = sale.barber ?? sale.appointments[0]?.barber ?? null;
  return barber ? { id: barber.id, name: fullName(barber.firstName, barber.lastName, "Unknown barber") } : null;
}

function buildBarbers(input: DateRangeInput, ctx: LoadedContext) {
  const result = baseResult("barbers", "Barber Performance Report", input, ctx, ctx.sales.length > 0 || ctx.appointments.length > 0);
  const map = new Map<string, { barber: string; assigned: number; completed: number; revenue: number; cancelled: number; noShow: number; ratingTotal: number; reviewCount: number; services: Set<string> }>();
  for (const appt of ctx.appointments) {
    const existing = map.get(appt.barberId) ?? { barber: fullName(appt.barber.firstName, appt.barber.lastName), assigned: 0, completed: 0, revenue: 0, cancelled: 0, noShow: 0, ratingTotal: 0, reviewCount: 0, services: new Set() };
    existing.assigned += 1;
    existing.completed += appt.status === AppointmentStatus.COMPLETED ? 1 : 0;
    existing.cancelled += appt.status === AppointmentStatus.CANCELLED ? 1 : 0;
    existing.noShow += appt.status === AppointmentStatus.NOSHOW ? 1 : 0;
    existing.services.add(appt.service.name);
    if (appt.review?.status === ReviewStatus.COMPLETED && appt.review.isVisible) {
      existing.ratingTotal += appt.review.rating;
      existing.reviewCount += 1;
    }
    map.set(appt.barberId, existing);
  }
  for (const sale of ctx.sales) {
    const barber = getSaleBarber(sale);
    if (!barber) continue;
    const existing = map.get(barber.id) ?? { barber: barber.name, assigned: 0, completed: 0, revenue: 0, cancelled: 0, noShow: 0, ratingTotal: 0, reviewCount: 0, services: new Set() };
    existing.revenue = roundNumber(existing.revenue + money(sale.totalAmount));
    for (const item of sale.items) existing.services.add(item.service.name);
    if (sale.reviews?.status === ReviewStatus.COMPLETED && sale.reviews.isVisible) {
      existing.ratingTotal += sale.reviews.rating;
      existing.reviewCount += 1;
    }
    map.set(barber.id, existing);
  }
  const rows = Array.from(map.values()).map((row) => ({
    rank: 0,
    barber: row.barber,
    assigned: row.assigned,
    completed: row.completed,
    revenue: row.revenue,
    averageTransaction: row.completed ? roundNumber(row.revenue / row.completed) : 0,
    completionRate: percent(row.completed, row.assigned),
    cancellations: row.cancelled,
    noShows: row.noShow,
    rating: row.reviewCount ? roundNumber(row.ratingTotal / row.reviewCount, 1) : null,
    reviewCount: row.reviewCount,
    servicesPerformed: Array.from(row.services).join(", "),
  })).sort((a, b) => b.revenue - a.revenue).map((row, index) => ({ ...row, rank: index + 1 }));
  result.metrics = [
    { label: "Top Revenue Barber", value: rows[0]?.barber ?? "None" },
    { label: "Most Appointments Completed", value: [...rows].sort((a, b) => b.completed - a.completed)[0]?.barber ?? "None" },
    { label: "Highest Rated Barber", value: [...rows].filter((row) => row.rating !== null).sort((a, b) => Number(b.rating) - Number(a.rating))[0]?.barber ?? "No rated barber" },
    { label: "Total Barber Revenue", value: roundNumber(rows.reduce((sum, row) => sum + row.revenue, 0)), numericValue: roundNumber(rows.reduce((sum, row) => sum + row.revenue, 0)) },
  ];
  result.charts = [
    { title: "Revenue by Barber", type: "bar", data: rows, xKey: "barber", series: [{ key: "revenue", label: "Revenue", kind: "money" }] },
    { title: "Completed Appointments by Barber", type: "bar", data: rows, xKey: "barber", series: [{ key: "completed", label: "Completed", kind: "number" }] },
    { title: "Average Rating by Barber", type: "bar", data: rows.filter((row) => row.rating !== null), xKey: "barber", series: [{ key: "rating", label: "Rating", kind: "number" }] },
  ];
  result.tables = [{ title: "Barber Ranking", columns: [
    { key: "rank", label: "Rank", kind: "number" }, { key: "barber", label: "Barber" }, { key: "completed", label: "Completed Services", kind: "number" }, { key: "revenue", label: "Revenue", kind: "money" }, { key: "averageTransaction", label: "Avg Transaction", kind: "money" }, { key: "rating", label: "Rating", kind: "number" }, { key: "completionRate", label: "Completion Rate", kind: "percent" },
  ], rows }];
  if (!rows.some((row) => row.reviewCount > 0)) result.notes.push("Average customer rating is omitted where no visible completed reviews can be safely associated with the barber through appointment or sale relationships.");
  result.ai.insight = rows[0] ? `${rows[0].barber} generated the highest barber-attributed revenue during the selected period.` : "No barber-attributed revenue was recorded.";
  result.ai.recommendation = rows[0] ? `Consider assigning additional peak-period availability to ${rows[0].barber} if workload capacity allows.` : "No barber scheduling recommendation is available without attributed activity.";
  result.csv = makeCsv("barbers-report.csv", result.tables[0].columns.map((column) => column.label), rows, result.tables[0].columns.map((column) => column.key));
  return result;
}

function buildCustomers(input: DateRangeInput, ctx: LoadedContext, firstSaleDates: Map<string, Date>) {
  const result = baseResult("customers", "Customer Analytics Report", input, ctx, ctx.sales.length > 0);
  const map = new Map<string, { customer: string; transactions: number; totalSpend: number; lastVisit: string }>();
  for (const sale of ctx.sales) {
    const existing = map.get(sale.customerId) ?? { customer: customerName(sale.customer), transactions: 0, totalSpend: 0, lastVisit: toDateOnly(sale.createdAt) };
    existing.transactions += 1;
    existing.totalSpend = roundNumber(existing.totalSpend + money(sale.totalAmount));
    if (sale.createdAt > new Date(existing.lastVisit)) existing.lastVisit = toDateOnly(sale.createdAt);
    map.set(sale.customerId, existing);
  }
  const rows = Array.from(map.entries()).map(([id, row]) => ({
    customerId: id,
    customer: row.customer,
    transactions: row.transactions,
    totalSpend: row.totalSpend,
    averageSpend: row.transactions ? roundNumber(row.totalSpend / row.transactions) : 0,
    lastVisit: row.lastVisit,
    type: firstSaleDates.get(id)! >= input.startDate ? "New" : "Returning",
  })).sort((a, b) => b.totalSpend - a.totalSpend);
  const newCustomers = rows.filter((row) => row.type === "New").length;
  const returningCustomers = rows.filter((row) => row.type === "Returning").length;
  const totalSpend = rows.reduce((sum, row) => sum + row.totalSpend, 0);
  result.metrics = [
    { label: "Total Unique Customers", value: rows.length, numericValue: rows.length },
    { label: "New Customers", value: newCustomers, numericValue: newCustomers },
    { label: "Returning Customers", value: returningCustomers, numericValue: returningCustomers },
    { label: "Repeat Customer Rate", value: percent(returningCustomers, rows.length), numericValue: percent(returningCustomers, rows.length) },
    { label: "Average Spend per Customer", value: rows.length ? roundNumber(totalSpend / rows.length) : 0 },
    { label: "Highest Spending Customer", value: rows[0]?.customer ?? "None" },
    { label: "Customers with Multiple Visits", value: rows.filter((row) => row.transactions > 1).length },
  ];
  result.charts = [
    { title: "New vs Returning Customers", type: "pie", data: [{ type: "New", customers: newCustomers }, { type: "Returning", customers: returningCustomers }], xKey: "type", series: [{ key: "customers", label: "Customers", kind: "number" }] },
    { title: "Customer Growth Trend", type: "line", data: buildTrend(ctx.sales, input.startDate, result.reportPeriod.granularity, (sale) => sale.createdAt, (_sale, bucket) => { bucket.customers = (bucket.customers ?? 0) + 1; }), xKey: "period", series: [{ key: "customers", label: "Transactions", kind: "number" }] },
    { title: "Customer Visits / transactions trend", type: "bar", data: buildTrend(ctx.sales, input.startDate, result.reportPeriod.granularity, (sale) => sale.createdAt, (_sale, bucket) => { bucket.transactions = (bucket.transactions ?? 0) + 1; }), xKey: "period", series: [{ key: "transactions", label: "Transactions", kind: "number" }] },
  ];
  result.tables = [{ title: "Top Customers", columns: [
    { key: "customer", label: "Customer" }, { key: "transactions", label: "Completed Transactions", kind: "number" }, { key: "totalSpend", label: "Total Spend", kind: "money" }, { key: "averageSpend", label: "Average Spend", kind: "money" }, { key: "lastVisit", label: "Last Visit", kind: "date" },
  ], rows: rows.slice(0, 50) }];
  result.ai.insight = returningCustomers > newCustomers ? "Returning customers generated a larger share of customer transactions than new customers." : "New customers made up at least as much selected-period customer activity as returning customers.";
  result.ai.recommendation = returningCustomers > 0 ? "Use targeted loyalty offers to keep repeat visits active while continuing new-customer acquisition." : "Focus follow-up offers on first-time customers to encourage a second visit.";
  result.csv = makeCsv("customers-report.csv", result.tables[0].columns.map((column) => column.label), result.tables[0].rows, result.tables[0].columns.map((column) => column.key));
  return result;
}

function buildLoyalty(input: DateRangeInput, ctx: LoadedContext) {
  const result = baseResult("loyalty", "Loyalty Program Report", input, ctx, ctx.loyaltyCards.length > 0 || ctx.loyaltyActivities.length > 0);
  const fiftyThreshold = ctx.settings?.fiftyPercentStickerThreshold ?? 5;
  const freeThreshold = ctx.settings?.freeStickerThreshold ?? 10;
  const earnedFifty = ctx.loyaltyActivities.filter((activity) => activity.stickerNumber === fiftyThreshold);
  const earnedFree = ctx.loyaltyActivities.filter((activity) => activity.stickerNumber === freeThreshold);
  const redeemedFifty = ctx.loyaltyActivities.filter((activity) => activity.rewardUsed === "FIFTY_PERCENT");
  const redeemedFree = ctx.loyaltyActivities.filter((activity) => activity.rewardUsed === "FREE");
  const rows = ctx.loyaltyActivities.map((activity) => ({
    customer: activity.Customer ? customerName(activity.Customer) : activity.customerName,
    reward: activity.rewardUsed !== "NONE" ? activity.rewardUsed : activity.stickerNumber === freeThreshold ? "FREE earned" : activity.stickerNumber === fiftyThreshold ? "50% earned" : "Visit sticker",
    status: activity.rewardUsed !== "NONE" ? "Redeemed" : "Earned",
    earnedDate: toDateOnly(activity.createdAt),
    redeemedDate: activity.rewardUsed !== "NONE" ? toDateOnly(activity.createdAt) : "",
  }));
  result.metrics = [
    { label: "Total Loyalty Participants", value: ctx.loyaltyCards.filter((card) => card.status === Status.ACTIVE).length },
    { label: "Rewards Earned", value: earnedFifty.length + earnedFree.length },
    { label: "Rewards Redeemed", value: redeemedFifty.length + redeemedFree.length },
    { label: "Redemption Rate", value: percent(redeemedFifty.length + redeemedFree.length, earnedFifty.length + earnedFree.length) },
    { label: "50% Rewards Earned/Redeemed", value: `${earnedFifty.length}/${redeemedFifty.length}` },
    { label: "Free Rewards Earned/Redeemed", value: `${earnedFree.length}/${redeemedFree.length}` },
    { label: "Customers Nearing Reward Eligibility", value: ctx.loyaltyCards.filter((card) => card.stars >= Math.max(0, fiftyThreshold - 2) && card.stars < freeThreshold).length },
    { label: "Loyalty-related visits", value: ctx.loyaltyActivities.filter((activity) => activity.stickerNumber !== null).length },
  ];
  result.charts = [
    { title: "Rewards Earned vs Redeemed", type: "bar", data: [{ type: "Earned", count: earnedFifty.length + earnedFree.length }, { type: "Redeemed", count: redeemedFifty.length + redeemedFree.length }], xKey: "type", series: [{ key: "count", label: "Rewards", kind: "number" }] },
    { title: "Loyalty Activity Trend", type: "line", data: buildTrend(ctx.loyaltyActivities, input.startDate, result.reportPeriod.granularity, (activity) => activity.createdAt, (_activity, bucket) => { bucket.activity = (bucket.activity ?? 0) + 1; }), xKey: "period", series: [{ key: "activity", label: "Activity", kind: "number" }] },
    { title: "Reward Type Distribution", type: "pie", data: [{ reward: "50%", count: earnedFifty.length + redeemedFifty.length }, { reward: "Free", count: earnedFree.length + redeemedFree.length }], xKey: "reward", series: [{ key: "count", label: "Count", kind: "number" }] },
  ];
  result.tables = [{ title: "Loyalty Activity", columns: [
    { key: "customer", label: "Customer" }, { key: "reward", label: "Eligible/earned reward" }, { key: "status", label: "Redeemed status" }, { key: "earnedDate", label: "Earned date", kind: "date" }, { key: "redeemedDate", label: "Redeemed date", kind: "date" },
  ], rows }];
  result.ai.insight = `${redeemedFifty.length + redeemedFree.length} loyalty rewards were redeemed during the selected period.`;
  result.ai.recommendation = result.metrics[6].numericValue || Number(result.metrics[6].value) > 0 ? "Target customers near reward eligibility with reminders to encourage another visit." : "No near-eligibility loyalty segment is visible from the current loyalty card balances.";
  result.csv = makeCsv("loyalty-report.csv", result.tables[0].columns.map((column) => column.label), rows, result.tables[0].columns.map((column) => column.key));
  return result;
}

function buildDiscounts(input: DateRangeInput, ctx: LoadedContext) {
  const result = baseResult("discounts", "Discount Analytics Report", input, ctx, ctx.sales.some((sale) => money(sale.discount) > 0));
  const discounted = ctx.sales.filter((sale) => money(sale.discount) > 0);
  const revenueBefore = roundNumber(ctx.sales.reduce((sum, sale) => sum + money(sale.subtotal), 0));
  const revenueAfter = result.legacySummary.totalRevenue;
  const totalDiscount = roundNumber(discounted.reduce((sum, sale) => sum + money(sale.discount), 0));
  const rows = discounted.map((sale) => ({
    transactionCode: sale.saleCode,
    date: toDateOnly(sale.createdAt),
    discountType: sale.specialDiscountType ?? (sale.LoyaltyCardActivity.find((activity) => activity.rewardUsed !== "NONE")?.rewardUsed ?? "Manual/unspecified"),
    subtotal: money(sale.subtotal),
    discount: money(sale.discount),
    total: money(sale.totalAmount),
  }));
  const typeRows = Array.from(rows.reduce((map, row) => {
    const existing = map.get(String(row.discountType)) ?? { discountType: String(row.discountType), usageCount: 0, totalDiscountAmount: 0, revenue: 0 };
    existing.usageCount += 1;
    existing.totalDiscountAmount = roundNumber(existing.totalDiscountAmount + Number(row.discount));
    existing.revenue = roundNumber(existing.revenue + Number(row.total));
    map.set(String(row.discountType), existing);
    return map;
  }, new Map<string, { discountType: string; usageCount: number; totalDiscountAmount: number; revenue: number }>()).values());
  result.metrics = [
    { label: "Total Discount Amount Given", value: totalDiscount },
    { label: "Number of Discounted Transactions", value: discounted.length },
    { label: "Average Discount per Discounted Transaction", value: discounted.length ? roundNumber(totalDiscount / discounted.length) : 0 },
    { label: "Percentage of Transactions with Discounts", value: percent(discounted.length, ctx.sales.length) },
    { label: "Revenue Before Discounts", value: revenueBefore },
    { label: "Revenue After Discounts", value: revenueAfter },
  ];
  result.charts = [
    { title: "Discount Amount Trend", type: "line", data: buildTrend(discounted, input.startDate, result.reportPeriod.granularity, (sale) => sale.createdAt, (sale, bucket) => { bucket.discount = roundNumber((bucket.discount ?? 0) + money(sale.discount)); }), xKey: "period", series: [{ key: "discount", label: "Discount", kind: "money" }] },
    { title: "Discounted vs Non-discounted Transactions", type: "pie", data: [{ type: "Discounted", transactions: discounted.length }, { type: "Non-discounted", transactions: ctx.sales.length - discounted.length }], xKey: "type", series: [{ key: "transactions", label: "Transactions", kind: "number" }] },
    { title: "Discount distribution", type: "bar", data: typeRows, xKey: "discountType", series: [{ key: "totalDiscountAmount", label: "Discount Amount", kind: "money" }] },
  ];
  result.tables = [
    { title: "Discount Type Summary", columns: [
      { key: "discountType", label: "Discount Type" }, { key: "usageCount", label: "Usage Count", kind: "number" }, { key: "totalDiscountAmount", label: "Total Discount Amount", kind: "money" }, { key: "revenue", label: "Revenue", kind: "money" },
    ], rows: typeRows },
    { title: "Discounted Transactions", columns: [
      { key: "transactionCode", label: "Transaction Code" }, { key: "date", label: "Date", kind: "date" }, { key: "subtotal", label: "Subtotal", kind: "money" }, { key: "discount", label: "Discount", kind: "money" }, { key: "total", label: "Total", kind: "money" },
    ], rows },
  ];
  result.ai.insight = discounted.length ? `${percent(discounted.length, ctx.sales.length)}% of completed transactions included a discount.` : "No discounted paid transactions were recorded.";
  result.ai.recommendation = discounted.length ? "Compare discount usage against repeat visits before expanding discount offers." : "No discount action is needed for this period because no discounts were applied.";
  result.csv = makeCsv("discounts-report.csv", result.tables[1].columns.map((column) => column.label), rows, result.tables[1].columns.map((column) => column.key));
  return result;
}

export async function buildBusinessReportAnalytics(input: DateRangeInput): Promise<ReportAnalyticsResult> {
  const reportType = input.reportType && isReportType(input.reportType) ? input.reportType : "summary";
  const ctx = await loadContext(input.startDate, input.endDate);
  const customerIds = Array.from(new Set(ctx.sales.map((sale) => sale.customerId)));
  const firstSaleDates = await customerFirstSaleDates(customerIds);

  switch (reportType) {
    case "sales":
      return buildSales(input, ctx);
    case "appointments":
      return buildAppointments(input, ctx);
    case "services":
      return buildServices(input, ctx);
    case "barbers":
      return buildBarbers(input, ctx);
    case "customers":
      return buildCustomers(input, ctx, firstSaleDates);
    case "loyalty":
      return buildLoyalty(input, ctx);
    case "discounts":
      return buildDiscounts(input, ctx);
    case "summary":
    default:
      return buildSummary(input, ctx, firstSaleDates);
  }
}

export async function buildAIReportAnalytics(input: DateRangeInput): Promise<AIReportAnalytics> {
  return buildBusinessReportAnalytics(input);
}

export function mergeAIReportAnalysis(
  report: ReportAnalyticsResult,
  ai: {
    insights?: { icon: string; title: string; body: string }[];
    weeklyInsight?: string;
    serviceRecommendation?: string;
    revenueTrend?: number;
    avgTrend?: number;
    apptTrend?: number;
    rateTrend?: number;
  },
): ReportAnalyticsResult {
  const next = { ...report, ai: { ...report.ai } };
  next.ai.insights = ai.insights ?? report.ai.insights;
  next.ai.weeklyInsight = ai.weeklyInsight ?? report.ai.weeklyInsight;
  next.ai.serviceRecommendation = ai.serviceRecommendation ?? report.ai.serviceRecommendation;
  const firstInsight = ai.insights?.[0] ?? findInsight(report, "insight");
  const firstRecommendation = ai.insights?.[1] ?? findInsight(report, "recommendation");
  next.ai.insight = ai.weeklyInsight || firstInsight?.body || report.ai.insight;
  next.ai.recommendation = ai.serviceRecommendation || firstRecommendation?.body || report.ai.recommendation;
  next.legacySummary = {
    ...report.legacySummary,
    revenueTrend: ai.revenueTrend ?? report.legacySummary.revenueTrend,
    avgTrend: ai.avgTrend ?? report.legacySummary.avgTrend,
    apptTrend: ai.apptTrend ?? report.legacySummary.apptTrend,
    rateTrend: ai.rateTrend ?? report.legacySummary.rateTrend,
  };
  return next;
}
