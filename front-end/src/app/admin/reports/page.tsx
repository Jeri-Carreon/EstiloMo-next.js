"use client";

import AIUsageDashboard from "@/components/admin/AIUsageDashboard";
import { exportReportToPdf } from "@/lib/exportReportToPdf";
import { createClient } from "@/lib/supabase/client";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import SendIcon from "@mui/icons-material/Send";
import TableViewIcon from "@mui/icons-material/TableView";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ReportType =
  | "summary"
  | "sales"
  | "appointments"
  | "services"
  | "barbers"
  | "customers"
  | "loyalty"
  | "discounts";

type ReportMetric = {
  label: string;
  value: string | number;
  numericValue?: number;
  changePercent?: number | null;
  kind?: "money" | "count" | "percent" | "text";
};

type ReportChart = {
  title: string;
  type: "line" | "bar" | "pie";
  data: Record<string, string | number | null>[];
  xKey?: string;
  series: { key: string; label: string; kind?: "money" | "number" | "percent" }[];
};

type ReportTable = {
  title: string;
  columns: { key: string; label: string; kind?: "money" | "number" | "percent" | "date" }[];
  rows: Record<string, string | number | null>[];
};

type ReportData = {
  reportType: ReportType;
  reportTitle: string;
  dateRange: string;
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
};

type AiInsightsPayload = {
  insights?: { icon: string; title: string; body: string }[];
  weeklyInsight?: string;
  serviceRecommendation?: string;
  revenueTrend?: number;
  avgTrend?: number;
  apptTrend?: number;
  rateTrend?: number;
};

type ReportRequest = {
  from: string;
  to: string;
  dateRange: string;
  reportType: ReportType;
};

type PendingReportRequest = ReportRequest & {
  estimate: ReportCostEstimate;
};

type ReportCostEstimate = {
  model: string;
  dateRange: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  estimatedInputCostUSD: number;
  estimatedOutputCostUSD: number;
  estimatedTotalCostUSD: number;
  exchangeRatePHP: number;
  estimatedTotalCostPHP: number;
  maxOutputTokens: number;
  isEstimate: boolean;
};

type ChatMsg = { role: "user" | "assistant"; text: string };
type ChatCostEstimate = {
  model: string;
  estimatedTotalCostPHP: number;
  estimatedTotalCostUSD: number;
  estimatedTotalTokens: number;
  isEstimate: boolean;
};
type ChatCostEstimateResponse = { regular: ChatCostEstimate; deep: ChatCostEstimate };

function buildChatReportContext(reportData: ReportData) {
  return {
    reportType: reportData.reportType,
    reportTitle: reportData.reportTitle,
    dateRange: reportData.dateRange,
    hasData: reportData.hasData,
    metrics: reportData.metrics,
    charts: reportData.charts,
    tables: reportData.tables,
    ai: reportData.ai,
    notes: reportData.notes,
    sourceData: reportData.sourceData,
  };
}

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "sales", label: "Sales" },
  { value: "appointments", label: "Appointments" },
  { value: "services", label: "Services" },
  { value: "barbers", label: "Barbers" },
  { value: "customers", label: "Customers" },
  { value: "loyalty", label: "Loyalty" },
  { value: "discounts", label: "Discounts" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => 2020 + i);
const PIE_COLORS = ["#111111", "#FBBC05", "#4285F4", "#34A853", "#EA4335", "#7C3AED", "#0F766E"];
const SALES_CHART_COLORS = {
  revenue: "#D18B00",
  transactions: "#2563EB",
  booking: "#2563EB",
  walkin: "#E27622",
  cash: "#2E8B57",
  gcash: "#0F766E",
  online: "#7C3AED",
  discount: "#DC2626",
  vat: "#D97706",
} as const;
const SUMMARY_CHART_COLORS = {
  revenue: "#D18B00",
  transactions: "#2563EB",
  booking: "#2563EB",
  walkin: "#E27622",
  newCustomer: "#0F766E",
  returningCustomer: "#7C3AED",
  appointments: "#0F766E",
} as const;
const SUMMARY_SERVICE_COLORS = ["#2563EB", "#E27622", "#0F766E", "#7C3AED", "#D18B00", "#DC2626", "#16A34A"];
const APPOINTMENT_STATUS_COLORS = {
  COMPLETED: "#16A34A",
  SCHEDULED: "#2563EB",
  CANCELLED: "#E27622",
  NOSHOW: "#DC2626",
  REJECTED: "#9F1239",
  PENDING: "#D97706",
} as const;
const APPOINTMENT_STATUS_LABELS = [
  ["COMPLETED", "Completed"],
  ["SCHEDULED", "Scheduled"],
  ["CANCELLED", "Cancelled"],
  ["NOSHOW", "No-show"],
  ["REJECTED", "Rejected"],
  ["PENDING", "Pending"],
] as const;
const SERVICES_CHART_COLORS = [
  "#2563EB", // blue
  "#E27622", // orange
  "#16A34A", // green
  "#DC2626", // red
  "#7C3AED", // purple
  "#0F766E", // teal
  "#D18B00", // gold
  "#0891B2", // cyan
  "#E11D48", // rose
  "#4F46E5", // indigo
  "#708238", // olive
  "#8B5E3C", // brown
];
const BARBER_CHART_COLORS = [
  "#2563EB", // blue
  "#E27622", // orange
  "#16A34A", // green
  "#DC2626", // red
  "#7C3AED", // purple
  "#0F766E", // teal
  "#D18B00", // gold
  "#0891B2", // cyan
  "#E11D48", // rose
  "#4F46E5", // indigo
  "#708238", // olive
  "#8B5E3C", // brown
];
const CUSTOMER_CHART_COLORS = {
  newCustomer: "#0F766E",
  returningCustomer: "#7C3AED",
  totalGrowth: "#2563EB",
  multipleVisit: "#16A34A",
  singleVisit: "#D18B00",
} as const;
const LOYALTY_CHART_COLORS = {
  earned: "#0F766E",
  redeemed: "#16A34A",
  activity: "#7C3AED",
  fiftyPercent: "#D18B00",
  free: "#0891B2",
  eligibility: "#D97706",
} as const;
const DISCOUNT_CHART_COLORS = {
  before: "#2563EB",
  after: "#16A34A",
  discount: "#E27622",
  discounted: "#E27622",
  nonDiscounted: "#0F766E",
} as const;
const DISCOUNT_USAGE_COLORS = {
  discounted: DISCOUNT_CHART_COLORS.discounted,
  nonDiscounted: DISCOUNT_CHART_COLORS.nonDiscounted,
} as const;
const DISCOUNT_CATEGORY_COLORS = ["#2563EB", "#E27622", "#16A34A", "#DC2626", "#7C3AED", "#0F766E", "#D18B00", "#0891B2", "#E11D48", "#4F46E5"];
const QUICK_QUESTIONS = [
  "What is the most important trend in this report?",
  "What should I improve first?",
  "Which metric needs attention?",
  "How should I act on this data?",
];

const reportActionButtonSx = {
  minHeight: 40,
  px: 2,
  borderRadius: 2,
  textTransform: "none",
  fontWeight: 700,
  whiteSpace: "nowrap",
  width: { xs: "100%", sm: "auto" },
};

function formatDate(d: Date | null): string {
  if (!d) return "-";
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sameDay(a: Date | null, b: Date | null): boolean {
  return Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
}

function buildCalDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  return [...Array(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
}

function formatPeso(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatValue(value: string | number | null | undefined, kind?: ReportTable["columns"][number]["kind"] | "money" | "number" | "percent"): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") {
    if (kind === "money") return formatPeso(value);
    if (kind === "percent") return `${value.toLocaleString()}%`;
    return value.toLocaleString();
  }
  return value;
}

function formatMetric(metric: ReportMetric): string {
  const numeric = typeof metric.numericValue === "number" ? metric.numericValue : typeof metric.value === "number" ? metric.value : null;
  if (numeric !== null && metric.kind === "money") return formatPeso(numeric);
  if (numeric !== null && metric.kind === "count") return numeric.toLocaleString();
  if (numeric !== null && metric.kind === "percent") return `${numeric.toLocaleString()}%`;
  const lower = metric.label.toLowerCase();
  if (numeric !== null && (lower.includes("revenue") || lower.includes("sales") || lower.includes("amount") || lower.includes("subtotal") || lower.includes("discount") || lower.includes("vat") || lower.includes("spend") || lower.includes("payment") || lower.includes("transaction value"))) {
    return formatPeso(numeric);
  }
  if (numeric !== null && (lower.includes("rate") || lower.includes("percentage") || lower.includes("configured vat"))) {
    return `${numeric.toLocaleString()}%`;
  }
  return formatValue(metric.value);
}

function formatTokenCount(value: number): string {
  return value.toLocaleString("en-US");
}

function formatCostUSD(value: number): string {
  return `$${value.toFixed(4)}`;
}

function formatCostPHP(value: number): string {
  return `PHP ${value.toFixed(4)}`;
}

function formatManilaDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function sanitizeFilename(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildReportPdfFilename(reportRequest: ReportRequest | null): string {
  const period = reportRequest?.from && reportRequest?.to ? `${reportRequest.from}_to_${reportRequest.to}` : toISO(new Date());
  const reportType = REPORT_OPTIONS.find((item) => item.value === reportRequest?.reportType)?.label ?? "Report";
  return `${sanitizeFilename(`EstiloMo_${reportType}_${period}`)}.pdf`;
}

function csvEscape(value: string | number | null) {
  const str = String(value ?? "");
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCSV(data: ReportData): string {
  const lines = [data.csv.columns.map(csvEscape).join(",")];
  for (const row of data.csv.rows) lines.push(row.map(csvEscape).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

function mergeAI(report: ReportData, ai: AiInsightsPayload): ReportData {
  return {
    ...report,
    ai: {
      ...report.ai,
      insights: ai.insights ?? report.ai.insights,
      weeklyInsight: ai.weeklyInsight ?? report.ai.weeklyInsight,
      serviceRecommendation: ai.serviceRecommendation ?? report.ai.serviceRecommendation,
      insight: ai.weeklyInsight || ai.insights?.[0]?.body || report.ai.insight,
      recommendation: ai.serviceRecommendation || ai.insights?.[1]?.body || report.ai.recommendation,
    },
  };
}

function Calendar({
  monthDate,
  startDate,
  endDate,
  onNavigate,
  onSelectDay,
}: {
  monthDate: Date;
  startDate: Date | null;
  endDate: Date | null;
  onNavigate: (dir: -1 | 1) => void;
  onSelectDay: (date: Date) => void;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const today = new Date();
  const calDays = buildCalDays(year, month);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
        <IconButton size="small" onClick={() => onNavigate(-1)} sx={{ p: 0.5 }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15, textAlign: "center" }}>
          {MONTHS[month]}
        </Typography>
        <IconButton size="small" onClick={() => onNavigate(1)} sx={{ p: 0.5 }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ border: "1px solid #d0d0d0", borderRadius: 2, overflow: "hidden", bgcolor: "#fff" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {WEEKDAYS.map((d) => (
            <Box key={d} sx={{ textAlign: "center", py: 0.8, fontSize: 11, fontWeight: 600, color: "#666", borderRight: "1px solid #e0e0e0", borderBottom: "1px solid #d0d0d0", "&:last-child": { borderRight: "none" } }}>
              {d}
            </Box>
          ))}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {calDays.map((day, index) => {
            if (!day) {
              return <Box key={`empty-${index}`} sx={{ minHeight: 36, borderRight: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", bgcolor: "#f0f0f0", "&:nth-of-type(7n)": { borderRight: "none" } }} />;
            }

            const dt = new Date(year, month, day);
            const isStart = sameDay(dt, startDate);
            const isEnd = sameDay(dt, endDate);
            const isToday = sameDay(dt, today);
            const isInRange = Boolean(startDate && endDate && dt > startDate && dt < endDate);
            const bgColor = isStart || isEnd ? "#111" : isInRange ? "#ebebeb" : isToday ? "#f5f5f5" : "#fafafa";
            const textColor = isStart || isEnd ? "#fff" : "#222";

            return (
              <Box key={index} onClick={() => onSelectDay(dt)} sx={{ minHeight: 36, borderRight: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", p: "6px 6px 4px", bgcolor: bgColor, cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", "&:nth-of-type(7n)": { borderRight: "none" }, "&:hover": { filter: "brightness(0.94)" } }}>
                <Typography sx={{ fontSize: 12, fontWeight: isStart || isEnd ? 600 : 400, color: textColor, lineHeight: 1 }}>
                  {day}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

function StatCard({ metric }: { metric: ReportMetric }) {
  const trend = metric.changePercent;
  const positive = Number(trend ?? 0) >= 0;
  return (
    <Box className="print-report-card print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2, bgcolor: "#fff", minHeight: 112 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: 11, color: "#777", fontWeight: 700, lineHeight: 1.35 }}>
          {metric.label}
        </Typography>
        {trend !== null && trend !== undefined && (
          <Typography sx={{ fontSize: 11, color: positive ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
            {positive ? "up" : "down"} {Math.abs(trend)}%
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#111", lineHeight: 1.15, overflowWrap: "anywhere" }}>
        {formatMetric(metric)}
      </Typography>
      {typeof metric.numericValue === "number" && typeof metric.value === "string" && (
        <Typography sx={{ fontSize: 11, color: "#777", mt: 0.5 }}>{metric.value}</Typography>
      )}
    </Box>
  );
}

function ReportTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; dataKey?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: "#fff", border: "1px solid #d0d0d0", borderRadius: 1, p: 1.2, fontSize: 12 }}>
      <Typography sx={{ fontWeight: 800, mb: 0.5, fontSize: 12 }}>{label}</Typography>
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.name ?? "");
        const value = Number(item.value ?? 0);
        const display = key.toLowerCase().includes("revenue") || key.toLowerCase().includes("amount") || key.toLowerCase().includes("discount") ? formatPeso(value) : value.toLocaleString();
        return (
          <Typography key={key} sx={{ fontSize: 12 }}>
            {item.name ?? key}: {display}
          </Typography>
        );
      })}
    </Box>
  );
}

function salesSeriesColor(chart: ReportChart, seriesKey: string, index: number): string {
  if (chart.title === "Revenue over time" || seriesKey === "revenue") return SALES_CHART_COLORS.revenue;
  if (chart.title === "Transactions over time" || seriesKey === "transactions") return SALES_CHART_COLORS.transactions;
  return PIE_COLORS[index % PIE_COLORS.length];
}

function appointmentSeriesColor(chart: ReportChart, seriesKey: string, index: number): string {
  if (seriesKey === "total") return APPOINTMENT_STATUS_COLORS.SCHEDULED;
  if (seriesKey === "completed") return APPOINTMENT_STATUS_COLORS.COMPLETED;
  if (seriesKey === "cancelled") return APPOINTMENT_STATUS_COLORS.CANCELLED;
  if (seriesKey === "noShow") return APPOINTMENT_STATUS_COLORS.NOSHOW;
  if (seriesKey === "scheduled") return APPOINTMENT_STATUS_COLORS.SCHEDULED;
  if (seriesKey === "rejected") return APPOINTMENT_STATUS_COLORS.REJECTED;
  if (seriesKey === "pending") return APPOINTMENT_STATUS_COLORS.PENDING;
  return PIE_COLORS[index % PIE_COLORS.length];
}

function customerSeriesColor(chart: ReportChart, seriesKey: string): string {
  if (chart.title === "Customer Growth Trend" || seriesKey === "customers" || seriesKey === "transactions") return CUSTOMER_CHART_COLORS.totalGrowth;
  if (seriesKey.toLowerCase().includes("new")) return CUSTOMER_CHART_COLORS.newCustomer;
  if (seriesKey.toLowerCase().includes("return")) return CUSTOMER_CHART_COLORS.returningCustomer;
  return CUSTOMER_CHART_COLORS.totalGrowth;
}

function discountSeriesColor(): string {
  return DISCOUNT_CHART_COLORS.discount;
}

function createDiscountCategoryColorMap(chart: ReportChart): Map<string, string> {
  const categories = Array.from(new Set(chart.data.map((row) => String(row[chart.xKey ?? "discountType"] ?? ""))))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  return new Map(categories.map((category, index) => [category, DISCOUNT_CATEGORY_COLORS[index % DISCOUNT_CATEGORY_COLORS.length]]));
}

function createServiceColorMap(chart: ReportChart): Map<string, string> {
  const serviceNames = Array.from(new Set(chart.data.map((row) => String(row[chart.xKey ?? "service"] ?? ""))))
    .sort((a, b) => a.localeCompare(b));
  return new Map(serviceNames.map((service, index) => [service, SERVICES_CHART_COLORS[index % SERVICES_CHART_COLORS.length]]));
}

function createBarberColorMap(charts: ReportChart[]): Map<string, string> {
  const barberNames = Array.from(new Set(charts.flatMap((chart) => chart.data.map((row) => String(row[chart.xKey ?? "barber"] ?? "")))))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  return new Map(barberNames.map((barber, index) => [barber, BARBER_CHART_COLORS[index % BARBER_CHART_COLORS.length]]));
}

function ChartCard({ chart, sales = false, appointments = false, services = false, customers = false, discounts = false, barberColorMap }: { chart: ReportChart; sales?: boolean; appointments?: boolean; services?: boolean; customers?: boolean; discounts?: boolean; barberColorMap?: Map<string, string> }) {
  const hasData = chart.data.some((row) => chart.series.some((series) => Number(row[series.key] ?? 0) > 0));
  const serviceColorMap = services ? createServiceColorMap(chart) : null;
  const discountColorMap = discounts && chart.type === "bar" ? createDiscountCategoryColorMap(chart) : null;
  const serviceColorForRow = (row: Record<string, string | number | null>) => serviceColorMap?.get(String(row[chart.xKey ?? "service"] ?? "")) ?? SERVICES_CHART_COLORS[0];
  const barberColorForRow = (row: Record<string, string | number | null>) => barberColorMap?.get(String(row[chart.xKey ?? "barber"] ?? "")) ?? BARBER_CHART_COLORS[0];
  const customerColorForRow = (row: Record<string, string | number | null>) => String(row[chart.xKey ?? "type"] ?? "").toLowerCase().includes("return") ? CUSTOMER_CHART_COLORS.returningCustomer : CUSTOMER_CHART_COLORS.newCustomer;
  const discountColorForRow = (row: Record<string, string | number | null>) => discountColorMap?.get(String(row[chart.xKey ?? "discountType"] ?? "")) ?? DISCOUNT_CATEGORY_COLORS[0];

  return (
    <Box className="print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff" }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>{chart.title}</Typography>
      {!hasData ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>
          No data available for the selected period.
        </Typography>
      ) : chart.type === "pie" ? (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <PieChart width={240} height={190}>
            <Pie data={chart.data} dataKey={chart.series[0].key} nameKey={chart.xKey} cx={120} cy={95} innerRadius={54} outerRadius={82} paddingAngle={2}>
              {chart.data.map((row, i) => <Cell key={i} fill={services ? serviceColorForRow(row) : barberColorMap ? barberColorForRow(row) : customers ? customerColorForRow(row) : discounts ? discountColorForRow(row) : PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip content={<ReportTooltip />} />
          </PieChart>
        </Box>
      ) : chart.type === "bar" ? (
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={chart.xKey} tick={{ fontSize: 10 }} interval={0} angle={chart.data.length > 6 ? -25 : 0} height={chart.data.length > 6 ? 56 : 30} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ReportTooltip />} />
            {chart.series.map((series, index) => (
              <Bar key={series.key} dataKey={series.key} name={series.label} fill={sales ? salesSeriesColor(chart, series.key, index) : appointments ? appointmentSeriesColor(chart, series.key, index) : services ? SERVICES_CHART_COLORS[0] : barberColorMap ? BARBER_CHART_COLORS[0] : customers ? customerSeriesColor(chart, series.key) : discounts ? discountSeriesColor() : PIE_COLORS[index % PIE_COLORS.length]}>
                {services && chart.data.map((row) => <Cell key={String(row[chart.xKey ?? ""])} fill={serviceColorForRow(row)} />)}
                {barberColorMap && chart.data.map((row) => <Cell key={String(row[chart.xKey ?? "barber"])} fill={barberColorForRow(row)} />)}
                {discounts && chart.title === "Discount distribution" && chart.data.map((row) => <Cell key={String(row[chart.xKey ?? "discountType"])} fill={discountColorForRow(row)} />)}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ReportTooltip />} />
            {chart.series.map((series, index) => <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={sales ? salesSeriesColor(chart, series.key, index) : appointments ? appointmentSeriesColor(chart, series.key, index) : customers ? customerSeriesColor(chart, series.key) : discounts ? discountSeriesColor() : PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />)}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}

function SummaryTrendCard({ chart, averageRevenuePerDay }: { chart?: ReportChart; averageRevenuePerDay?: ReportMetric }) {
  const data = chart?.data ?? [];
  const hasData = data.some((row) => Number(row.revenue ?? 0) > 0 || Number(row.transactions ?? 0) > 0);

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, mb: 1.5, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Revenue and Transaction Trend</Typography>
        {averageRevenuePerDay && <Typography sx={{ fontSize: 12, color: "#666" }}>Average Revenue / Day <strong>{formatMetric({ ...averageRevenuePerDay, kind: "money" })}</strong></Typography>}
      </Box>
      {!hasData ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>
          No data available for the selected period.
        </Typography>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="revenue" tick={{ fontSize: 11 }} tickFormatter={(value) => `₱${Number(value).toLocaleString()}`} />
              <YAxis yAxisId="transactions" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ReportTooltip />} />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke={SUMMARY_CHART_COLORS.revenue} strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="transactions" type="monotone" dataKey="transactions" name="Transactions" stroke={SUMMARY_CHART_COLORS.transactions} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 1.2, mt: 2 }}>
            {data.map((row) => (
              <Box key={String(row.period)} sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.2, bgcolor: "#fafafa" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#111", mb: 0.5 }}>{row.period}</Typography>
                <Typography sx={{ fontSize: 12, color: "#555" }}>Revenue: {formatPeso(Number(row.revenue ?? 0))}</Typography>
                <Typography sx={{ fontSize: 12, color: "#555" }}>Transactions: {Number(row.transactions ?? 0).toLocaleString()}</Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

function SummaryServiceDistributionCard({ chart }: { chart?: ReportChart }) {
  const data = chart?.data ?? [];
  const totalRevenue = data.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
  const hasData = totalRevenue > 0;

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Service Revenue Distribution</Typography>
      {!hasData ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>
          No data available for the selected period.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "320px 1fr" }, gap: 2.5, alignItems: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <PieChart width={300} height={230}>
              <Pie data={data} dataKey="revenue" nameKey="name" cx={150} cy={115} innerRadius={68} outerRadius={98} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={SUMMARY_SERVICE_COLORS[i % SUMMARY_SERVICE_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ReportTooltip />} />
            </PieChart>
          </Box>
          <Box sx={{ display: "grid", gap: 1 }}>
            {data.map((row, index) => {
              const revenue = Number(row.revenue ?? 0);
              const share = totalRevenue ? (revenue / totalRevenue) * 100 : 0;
              return (
                <Box key={String(row.name)} sx={{ display: "grid", gridTemplateColumns: "12px 1fr", gap: 1, alignItems: "start", py: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: SUMMARY_SERVICE_COLORS[index % SUMMARY_SERVICE_COLORS.length], mt: 0.45 }} />
                  <Box>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "#111" }}>{row.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: "#555" }}>
                      {Number(row.count ?? 0).toLocaleString()} services • {formatPeso(revenue)} • {share.toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function summarySourceColor(source: string): string {
  return source.toLowerCase().includes("booking") ? SUMMARY_CHART_COLORS.booking : SUMMARY_CHART_COLORS.walkin;
}

function CustomersMixCard({ chart }: { chart?: ReportChart }) {
  const rows = chart?.data ?? [];
  const newCustomers = Number(rows.find((row) => String(row.type) === "New")?.customers ?? 0);
  const returningCustomers = Number(rows.find((row) => String(row.type) === "Returning")?.customers ?? 0);
  const total = newCustomers + returningCustomers;
  const breakdown = [
    { label: "New Customers", count: newCustomers, color: CUSTOMER_CHART_COLORS.newCustomer },
    { label: "Returning Customers", count: returningCustomers, color: CUSTOMER_CHART_COLORS.returningCustomer },
  ];

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>New vs Returning Customers</Typography>
      {!total ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>No customer data available for the selected period.</Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(240px, 0.85fr) minmax(0, 1.15fr)" }, gap: 2.5, alignItems: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <PieChart width={240} height={190}>
              <Pie data={rows} dataKey="customers" nameKey="type" cx={120} cy={95} innerRadius={54} outerRadius={82} paddingAngle={2}>
                {rows.map((row, index) => <Cell key={String(row.type) || index} fill={String(row.type) === "Returning" ? CUSTOMER_CHART_COLORS.returningCustomer : CUSTOMER_CHART_COLORS.newCustomer} />)}
              </Pie>
              <Tooltip content={<ReportTooltip />} />
            </PieChart>
          </Box>
          <Box sx={{ display: "grid", gap: 1.2 }}>
            {breakdown.map((row) => (
              <Box key={row.label} sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.4, bgcolor: "#fafafa" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: row.color }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{row.label}</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{row.count.toLocaleString()} customers</Typography>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{total ? ((row.count / total) * 100).toFixed(1) : "0.0"}% of customer mix</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function CustomersRetentionCard({ reportData }: { reportData: ReportData }) {
  const total = Number(reportData.metrics.find((metric) => metric.label === "Total Unique Customers")?.numericValue ?? 0);
  const multipleVisitsMetric = reportData.metrics.find((metric) => metric.label === "Customers with Multiple Visits");
  const multipleVisits = Number(multipleVisitsMetric?.numericValue ?? multipleVisitsMetric?.value ?? 0);
  const singleVisits = Math.max(0, total - multipleVisits);
  const rows = [
    { label: "Multiple Visits", count: multipleVisits, color: CUSTOMER_CHART_COLORS.multipleVisit },
    { label: "Single Visit", count: singleVisits, color: CUSTOMER_CHART_COLORS.singleVisit },
  ];

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1.5 }}>Customer Retention</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(230px, 0.8fr)" }, gap: 2, alignItems: "center" }}>
        <Box>
          <Typography sx={{ fontSize: 12, color: "#666", fontWeight: 700 }}>Customers with Multiple Visits</Typography>
          <Typography sx={{ fontSize: 23, fontWeight: 900, lineHeight: 1.2 }}>{multipleVisits.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ display: "grid", gap: 1 }}>
          {rows.map((row) => {
            const share = total ? (row.count / total) * 100 : 0;
            return (
              <Box key={row.label}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.35 }}>
                  <Typography sx={{ fontSize: 12, color: "#555" }}>{row.label}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{row.count.toLocaleString()} · {share.toFixed(1)}%</Typography>
                </Box>
                <Box sx={{ height: 8, borderRadius: 4, bgcolor: "#eeeeee", overflow: "hidden" }}>
                  <Box sx={{ width: `${Math.min(100, share)}%`, height: "100%", bgcolor: row.color, borderRadius: 4 }} />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

function CustomersReportBody({ reportData }: { reportData: ReportData }) {
  const mixChart = reportData.charts.find((chart) => chart.title === "New vs Returning Customers");
  const growthChart = reportData.charts.find((chart) => chart.title === "Customer Growth Trend");
  const visitsChart = reportData.charts.find((chart) => chart.title === "Customer Visits / transactions trend");

  return (
    <>
      <CustomersMixCard chart={mixChart} />
      <Box data-pdf-section className="print-report-section print-report-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
        {growthChart && <ChartCard chart={growthChart} customers />}
        {visitsChart && <ChartCard chart={visitsChart} customers />}
      </Box>
      <CustomersRetentionCard reportData={reportData} />
      <Box data-pdf-section className="print-report-section" sx={{ display: "grid", gap: 2, mb: 2.5 }}>
        {reportData.tables.map((table) => <DataTable key={table.title} table={table} />)}
      </Box>
    </>
  );
}

function loyaltyMetricNumber(reportData: ReportData, label: string): number {
  const metric = reportData.metrics.find((item) => item.label === label);
  return Number(metric?.numericValue ?? metric?.value ?? 0);
}

function loyaltyPair(reportData: ReportData, label: string): { earned: number; redeemed: number } {
  const metric = reportData.metrics.find((item) => item.label === label);
  const [earned, redeemed] = String(metric?.value ?? "0/0").split("/").map((value) => Number(value) || 0);
  return { earned, redeemed };
}

function LoyaltyRewardsSummaryCard({ chart, reportData }: { chart?: ReportChart; reportData: ReportData }) {
  const chartRows = chart?.data ?? [];
  const earned = loyaltyMetricNumber(reportData, "Rewards Earned");
  const redeemed = loyaltyMetricNumber(reportData, "Rewards Redeemed");
  const redemptionRate = loyaltyMetricNumber(reportData, "Redemption Rate");

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Rewards Earned vs Redeemed</Typography>
      {!chartRows.some((row) => Number(row.count ?? 0) > 0) ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>No reward activity available for the selected period.</Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.3fr) minmax(220px, 0.7fr)" }, gap: 2.5, alignItems: "center" }}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<ReportTooltip />} />
              <Bar dataKey="count" name="Rewards">
                {chartRows.map((row) => <Cell key={String(row.type)} fill={String(row.type) === "Redeemed" ? LOYALTY_CHART_COLORS.redeemed : LOYALTY_CHART_COLORS.earned} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ display: "grid", gap: 1.2 }}>
            <Box sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.4, bgcolor: "#fafafa" }}>
              <Typography sx={{ fontSize: 12, color: "#666", fontWeight: 700 }}>Rewards Earned</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 900, color: LOYALTY_CHART_COLORS.earned }}>{earned.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.4, bgcolor: "#fafafa" }}>
              <Typography sx={{ fontSize: 12, color: "#666", fontWeight: 700 }}>Rewards Redeemed</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 900, color: LOYALTY_CHART_COLORS.redeemed }}>{redeemed.toLocaleString()}</Typography>
            </Box>
            <Typography sx={{ fontSize: 12, color: "#555" }}>Redemption Rate: <strong>{redemptionRate.toLocaleString()}%</strong></Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

function LoyaltyRewardsByTypeCard({ reportData }: { reportData: ReportData }) {
  const fifty = loyaltyPair(reportData, "50% Rewards Earned/Redeemed");
  const free = loyaltyPair(reportData, "Free Rewards Earned/Redeemed");
  const data = [
    { reward: "50% Reward", earned: fifty.earned, redeemed: fifty.redeemed },
    { reward: "Free Reward", earned: free.earned, redeemed: free.redeemed },
  ];

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Rewards by Type</Typography>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="reward" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip content={<ReportTooltip />} />
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="earned" name="Earned" fill={LOYALTY_CHART_COLORS.earned} />
          <Bar dataKey="redeemed" name="Redeemed" fill={LOYALTY_CHART_COLORS.redeemed} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

function LoyaltyActivityCard({ chart, reportData }: { chart?: ReportChart; reportData: ReportData }) {
  const data = chart?.data ?? [];
  const visits = loyaltyMetricNumber(reportData, "Loyalty-related visits");

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Loyalty Activity</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.45fr) minmax(180px, 0.55fr)" }, gap: 2.5, alignItems: "center" }}>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip content={<ReportTooltip />} />
            <Line type="monotone" dataKey="activity" name="Activity" stroke={LOYALTY_CHART_COLORS.activity} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <Box sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.5, bgcolor: "#fafafa" }}>
          <Typography sx={{ fontSize: 12, color: "#666", fontWeight: 700 }}>Loyalty-related Visits</Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 900, color: LOYALTY_CHART_COLORS.activity }}>{visits.toLocaleString()}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function LoyaltyEligibilityCard({ reportData }: { reportData: ReportData }) {
  const nearing = loyaltyMetricNumber(reportData, "Customers Nearing Reward Eligibility");
  return (
    <Box data-pdf-section className="print-report-section print-report-card print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1.5 }}>Reward Eligibility</Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2 }}>
        <Typography sx={{ fontSize: 12, color: "#666", fontWeight: 700 }}>Customers Nearing Reward Eligibility</Typography>
        <Typography sx={{ fontSize: 23, fontWeight: 900, color: LOYALTY_CHART_COLORS.eligibility }}>{nearing.toLocaleString()}</Typography>
      </Box>
    </Box>
  );
}

function LoyaltyReportBody({ reportData }: { reportData: ReportData }) {
  const rewardsChart = reportData.charts.find((chart) => chart.title === "Rewards Earned vs Redeemed");
  const activityChart = reportData.charts.find((chart) => chart.title === "Loyalty Activity Trend");

  return (
    <>
      <LoyaltyRewardsSummaryCard chart={rewardsChart} reportData={reportData} />
      <LoyaltyRewardsByTypeCard reportData={reportData} />
      <LoyaltyActivityCard chart={activityChart} reportData={reportData} />
      <LoyaltyEligibilityCard reportData={reportData} />
      <Box data-pdf-section className="print-report-section" sx={{ display: "grid", gap: 2, mb: 2.5 }}>
        {reportData.tables.map((table) => <DataTable key={table.title} table={table} />)}
      </Box>
    </>
  );
}

function discountMetricNumber(reportData: ReportData, label: string): number {
  const metric = reportData.metrics.find((item) => item.label === label);
  const value = metric?.numericValue ?? metric?.value ?? 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function DiscountsRevenueImpactCard({ reportData }: { reportData: ReportData }) {
  const before = discountMetricNumber(reportData, "Revenue Before Discounts");
  const after = discountMetricNumber(reportData, "Revenue After Discounts");
  const discounts = discountMetricNumber(reportData, "Total Discount Amount Given");
  const data = [
    { type: "Before Discounts", amount: before },
    { type: "After Discounts", amount: after },
  ];

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Revenue Impact of Discounts</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.3fr) minmax(230px, 0.7fr)" }, gap: 2.5, alignItems: "center" }}>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="type" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `₱${Number(value).toLocaleString()}`} />
            <Tooltip content={<ReportTooltip />} />
            <Bar dataKey="amount" name="Revenue" fill={DISCOUNT_CHART_COLORS.before}>
              <Cell fill={DISCOUNT_CHART_COLORS.before} />
              <Cell fill={DISCOUNT_CHART_COLORS.after} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Box sx={{ display: "grid", gap: 1.2 }}>
          <Box sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.3, bgcolor: "#fafafa" }}>
            <Typography sx={{ fontSize: 12, color: "#666", fontWeight: 700 }}>Before Discounts</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 900, color: DISCOUNT_CHART_COLORS.before }}>{formatPeso(before)}</Typography>
          </Box>
          <Box sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.3, bgcolor: "#fafafa" }}>
            <Typography sx={{ fontSize: 12, color: "#666", fontWeight: 700 }}>Discounts Given</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 900, color: DISCOUNT_CHART_COLORS.discount }}>-{formatPeso(discounts)}</Typography>
          </Box>
          <Box sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.3, bgcolor: "#fafafa" }}>
            <Typography sx={{ fontSize: 12, color: "#666", fontWeight: 700 }}>After Discounts</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 900, color: DISCOUNT_CHART_COLORS.after }}>{formatPeso(after)}</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function DiscountsUsageCard({ chart }: { chart?: ReportChart }) {
  const rows = chart?.data ?? [];
  const total = rows.reduce((sum, row) => sum + Number(row.transactions ?? 0), 0);
  const usageColor = (type: string) => String(type).trim().toLowerCase() === "discounted"
    ? DISCOUNT_USAGE_COLORS.discounted
    : DISCOUNT_USAGE_COLORS.nonDiscounted;
  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Discount Usage</Typography>
      {!total ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>No qualifying transactions available for the selected period.</Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(240px, 0.85fr) minmax(0, 1.15fr)" }, gap: 2.5, alignItems: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <PieChart width={240} height={190}>
              <Pie data={rows} dataKey="transactions" nameKey="type" cx={120} cy={95} innerRadius={54} outerRadius={82} paddingAngle={2}>
                {rows.map((row) => <Cell key={String(row.type)} fill={usageColor(String(row.type))} />)}
              </Pie>
              <Tooltip content={<ReportTooltip />} />
            </PieChart>
          </Box>
          <Box sx={{ display: "grid", gap: 1.2 }}>
            {rows.map((row) => {
              const count = Number(row.transactions ?? 0);
              const isDiscounted = String(row.type).trim().toLowerCase() === "discounted";
              return (
                <Box key={String(row.type)} sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.4, bgcolor: "#fafafa" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: isDiscounted ? DISCOUNT_USAGE_COLORS.discounted : DISCOUNT_USAGE_COLORS.nonDiscounted }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{row.type}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: "#555" }}>{count.toLocaleString()} transactions</Typography>
                  <Typography sx={{ fontSize: 12, color: "#555" }}>{((count / total) * 100).toFixed(1)}% of transactions</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function DiscountsTrendCard({ chart, reportData }: { chart?: ReportChart; reportData: ReportData }) {
  const data = chart?.data ?? [];
  const average = discountMetricNumber(reportData, "Average Discount per Discounted Transaction");
  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, mb: 1.5, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Discount Amount Trend</Typography>
        <Typography sx={{ fontSize: 12, color: "#666" }}>Average Discount <strong>{formatPeso(average)}</strong></Typography>
      </Box>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `₱${Number(value).toLocaleString()}`} />
          <Tooltip content={<ReportTooltip />} />
          <Line type="monotone" dataKey="discount" name="Discount" stroke={DISCOUNT_CHART_COLORS.discount} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

function DiscountTypeSummaryCard({ chart }: { chart?: ReportChart }) {
  const rows = chart?.data ?? [];
  const colorMap = chart ? createDiscountCategoryColorMap(chart) : new Map<string, string>();
  const totalUsage = rows.reduce((sum, row) => sum + Number(row.usageCount ?? 0), 0);

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 0.5 }}>Discount Type Summary</Typography>
      <Typography sx={{ fontSize: 11, color: "#777", mb: 2 }}>Share of discounted transactions by stored discount type.</Typography>
      {!totalUsage ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>No discount type data available for the selected period.</Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(240px, 0.85fr) minmax(0, 1.15fr)" }, gap: 2.5, alignItems: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <PieChart width={240} height={190}>
              <Pie data={rows.filter((row) => Number(row.usageCount ?? 0) > 0)} dataKey="usageCount" nameKey="discountType" cx={120} cy={95} innerRadius={54} outerRadius={82} paddingAngle={2}>
                {rows.filter((row) => Number(row.usageCount ?? 0) > 0).map((row) => <Cell key={String(row.discountType)} fill={colorMap.get(String(row.discountType)) ?? DISCOUNT_CATEGORY_COLORS[0]} />)}
              </Pie>
              <Tooltip content={<ReportTooltip />} />
            </PieChart>
          </Box>
          <Box sx={{ display: "grid", gap: 1.1 }}>
            {rows.map((row) => {
              const type = String(row.discountType);
              const count = Number(row.usageCount ?? 0);
              const color = colorMap.get(type) ?? DISCOUNT_CATEGORY_COLORS[0];
              return (
                <Box key={type} sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.25, bgcolor: "#fafafa" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.35 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{type}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: "#555" }}>{count.toLocaleString()} discounted transactions · {totalUsage ? ((count / totalUsage) * 100).toFixed(1) : "0.0"}%</Typography>
                  <Typography sx={{ fontSize: 12, color: "#555" }}>Discount amount: {formatPeso(Number(row.totalDiscountAmount ?? 0))}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function DiscountsReportBody({ reportData }: { reportData: ReportData }) {
  const usageChart = reportData.charts.find((chart) => chart.title === "Discounted vs Non-discounted Transactions");
  const trendChart = reportData.charts.find((chart) => chart.title === "Discount Amount Trend");
  const distributionChart = reportData.charts.find((chart) => chart.title === "Discount distribution");
  const discountTypeSummary = reportData.tables.find((table) => table.title === "Discount Type Summary");

  return (
    <>
      <DiscountsRevenueImpactCard reportData={reportData} />
      <DiscountsUsageCard chart={usageChart} />
      <DiscountsTrendCard chart={trendChart} reportData={reportData} />
      <DiscountTypeSummaryCard chart={distributionChart ?? (discountTypeSummary ? { title: "Discount distribution", type: "bar", data: discountTypeSummary.rows, xKey: "discountType", series: [{ key: "totalDiscountAmount", label: "Discount Amount", kind: "money" }] } : undefined)} />
      <Box data-pdf-section className="print-report-section" sx={{ display: "grid", gap: 2, mb: 2.5 }}>
        {reportData.tables.filter((table) => table.title !== "Discount Type Summary").map((table) => <DataTable key={table.title} table={table} />)}
      </Box>
    </>
  );
}

function SummarySourceCard({ chart, table }: { chart?: ReportChart; table?: ReportTable }) {
  const chartData = chart?.data ?? [];
  const rows = table?.rows?.length ? table.rows : chartData;
  const hasData = rows.some((row) => Number(row.revenue ?? 0) > 0 || Number(row.transactions ?? 0) > 0);
  const transactionTotal = rows.reduce((sum, row) => sum + Number(row.transactions ?? 0), 0);

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Booking vs Walk-in</Typography>
      {!hasData ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>
          No data available for the selected period.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.35fr) minmax(260px, 0.65fr)" }, gap: 2.5, alignItems: "center" }}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="source" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `₱${Number(value).toLocaleString()}`} />
              <Tooltip content={<ReportTooltip />} />
              <Bar dataKey="revenue" name="Revenue">
                {chartData.map((row) => <Cell key={String(row.source)} fill={summarySourceColor(String(row.source))} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ display: "grid", gap: 1.2 }}>
            {rows.map((row) => (
              <Box key={String(row.source)} sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.4, bgcolor: "#fafafa" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.7 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: summarySourceColor(String(row.source)) }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{row.source}</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{formatPeso(Number(row.revenue ?? 0))}</Typography>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{Number(row.transactions ?? 0).toLocaleString()} transactions</Typography>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{Number(row.revenueShare ?? 0).toLocaleString()}%</Typography>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{transactionTotal ? ((Number(row.transactions ?? 0) / transactionTotal) * 100).toFixed(1) : "0.0"}% of transactions</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function SummaryCustomerMixCard({ reportData }: { reportData: ReportData }) {
  const newCustomers = reportData.metrics.find((metric) => metric.label === "New Customers")?.numericValue ?? 0;
  const returningCustomers = reportData.metrics.find((metric) => metric.label === "Returning Customers")?.numericValue ?? 0;
  const data = [
    { name: "New Customers", count: newCustomers },
    { name: "Returning Customers", count: returningCustomers },
  ];
  const total = newCustomers + returningCustomers;

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Customer Mix</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "260px 1fr" }, gap: 2.5, alignItems: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          {total ? (
            <PieChart width={240} height={190}>
              <Pie data={data} dataKey="count" nameKey="name" cx={120} cy={95} innerRadius={54} outerRadius={82} paddingAngle={2}>
                <Cell fill={SUMMARY_CHART_COLORS.newCustomer} />
                <Cell fill={SUMMARY_CHART_COLORS.returningCustomer} />
              </Pie>
              <Tooltip content={<ReportTooltip />} />
            </PieChart>
          ) : <Typography sx={{ fontSize: 13, color: "#777", py: 4 }}>No customer data available.</Typography>}
        </Box>
        <Box sx={{ display: "grid", gap: 1.2 }}>
          {data.map((row, index) => (
            <Box key={row.name} sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.4, bgcolor: "#fafafa" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: index === 0 ? SUMMARY_CHART_COLORS.newCustomer : SUMMARY_CHART_COLORS.returningCustomer }} />
                <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{row.name}</Typography>
              </Box>
              <Typography sx={{ fontSize: 12, color: "#555" }}>{row.count.toLocaleString()} customers</Typography>
              <Typography sx={{ fontSize: 12, color: "#555" }}>{total ? ((row.count / total) * 100).toFixed(1) : "0.0"}% of customer mix</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function SummaryPeakAppointmentCard({ chart }: { chart?: ReportChart }) {
  const data = chart?.data ?? [];
  const total = data.reduce((sum, row) => sum + Number(row.appointments ?? 0), 0);
  const peak = data.reduce<Record<string, string | number | null> | null>(
    (best, row) => (!best || Number(row.appointments ?? 0) > Number(best.appointments ?? 0) ? row : best),
    null,
  );

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Peak Appointment Hours</Typography>
      {!total ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>
          No data available for the selected period.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.35fr) minmax(260px, 0.65fr)" }, gap: 2.5, alignItems: "center" }}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="timeBucket" tick={{ fontSize: 10 }} interval={0} angle={data.length > 5 ? -25 : 0} height={data.length > 5 ? 56 : 30} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<ReportTooltip />} />
              <Bar dataKey="appointments" name="Appointments" fill={SUMMARY_CHART_COLORS.appointments} />
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.5, bgcolor: "#fafafa" }}>
            <Typography sx={{ fontSize: 12, color: "#777", fontWeight: 700 }}>Busiest period</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 900, mt: 0.4 }}>{String(peak?.timeBucket ?? "Unavailable")}</Typography>
            <Typography sx={{ fontSize: 12, color: "#555", mt: 0.8 }}>{Number(peak?.appointments ?? 0).toLocaleString()} appointments</Typography>
            <Typography sx={{ fontSize: 12, color: "#555" }}>{Number(peak?.share ?? 0).toLocaleString()}% of qualifying appointments</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

function SummaryReportBody({ reportData }: { reportData: ReportData }) {
  const trendChart = reportData.charts.find((chart) => chart.title === "Revenue and Transaction Trend");
  const serviceChart = reportData.charts.find((chart) => chart.title === "Service Revenue Distribution");
  const sourceChart = reportData.charts.find((chart) => chart.title === "Revenue by Source");
  const sourceTable = reportData.tables.find((table) => table.title === "Source Breakdown");
  const averageRevenuePerDay = reportData.metrics.find((metric) => metric.label === "Average Revenue Per Day");

  return (
    <>
      <SummaryTrendCard chart={trendChart} averageRevenuePerDay={averageRevenuePerDay} />
      <SummarySourceCard chart={sourceChart} table={sourceTable} />
      <SummaryServiceDistributionCard chart={serviceChart} />
      <SummaryCustomerMixCard reportData={reportData} />
      <SummaryPeakAppointmentCard chart={reportData.charts.find((chart) => chart.title === "Peak Appointment Hours")} />
    </>
  );
}

function AppointmentStatusDistributionCard({ chart }: { chart?: ReportChart }) {
  const chartRows = chart?.data ?? [];
  const countByStatus = new Map(chartRows.map((row) => [String(row.status), Number(row.count ?? 0)]));
  const rows = APPOINTMENT_STATUS_LABELS.map(([status, label]) => ({ status, label, count: countByStatus.get(status) ?? 0 }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const visibleRows = rows.filter((row) => row.count > 0);

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Appointment Status Distribution</Typography>
      {!total ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>No data available for the selected period.</Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "300px 1fr" }, gap: 2.5, alignItems: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <PieChart width={270} height={220}>
              <Pie data={visibleRows} dataKey="count" nameKey="label" cx={135} cy={110} innerRadius={62} outerRadius={94} paddingAngle={2}>
                {visibleRows.map((row) => <Cell key={row.status} fill={APPOINTMENT_STATUS_COLORS[row.status as keyof typeof APPOINTMENT_STATUS_COLORS]} />)}
              </Pie>
              <Tooltip content={<ReportTooltip />} />
            </PieChart>
          </Box>
          <Box sx={{ display: "grid", gap: 0.8 }}>
            {rows.map((row) => (
              <Box key={row.status} sx={{ display: "flex", alignItems: "center", gap: 1, borderBottom: "1px solid #eee", py: 0.65 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: APPOINTMENT_STATUS_COLORS[row.status as keyof typeof APPOINTMENT_STATUS_COLORS], flexShrink: 0 }} />
                <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 700, color: "#333" }}>{row.label}</Typography>
                <Typography sx={{ fontSize: 12, color: "#555", whiteSpace: "nowrap" }}>{row.count.toLocaleString()} appointments</Typography>
                <Typography sx={{ width: 52, textAlign: "right", fontSize: 12, color: "#777", whiteSpace: "nowrap" }}>{total ? ((row.count / total) * 100).toFixed(1) : "0.0"}%</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function AppointmentPerformanceCard({ reportData }: { reportData: ReportData }) {
  const rates = [
    ["Completion Rate", "#16A34A"],
    ["Cancellation Rate", APPOINTMENT_STATUS_COLORS.CANCELLED],
    ["No-show Rate", APPOINTMENT_STATUS_COLORS.NOSHOW],
  ] as const;

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1.5 }}>Appointment Performance</Typography>
      <Box sx={{ display: "grid", gap: 1.6 }}>
        {rates.map(([label, color]) => {
          const metric = reportData.metrics.find((item) => item.label === label);
          const value = Number(metric?.numericValue ?? 0);
          return (
            <Box key={label} sx={{ display: "grid", gap: 0.6, width: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, width: "100%" }}>
                <Typography sx={{ fontSize: 12, color: "#555", fontWeight: 700, whiteSpace: "nowrap" }}>{label}</Typography>
                <Typography sx={{ fontSize: 13, color: "#222", fontWeight: 900, whiteSpace: "nowrap" }}>{value.toLocaleString()}%</Typography>
              </Box>
              <Box sx={{ width: "100%", height: 8, borderRadius: 4, bgcolor: "#eee", overflow: "hidden" }}>
                <Box sx={{ width: `${Math.min(Math.max(value, 0), 100)}%`, height: "100%", bgcolor: color, borderRadius: 4 }} />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function AppointmentsReportBody({ reportData }: { reportData: ReportData }) {
  const statusChart = reportData.charts.find((chart) => chart.title === "Appointment Status Distribution");
  const trendCharts = reportData.charts.filter((chart) => chart.title !== "Appointment Status Distribution");

  return (
    <>
      <AppointmentStatusDistributionCard chart={statusChart} />
      <AppointmentPerformanceCard reportData={reportData} />
      <Box data-pdf-section className="print-report-section print-report-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
        {trendCharts.map((chart) => <ChartCard key={chart.title} chart={chart} appointments />)}
      </Box>
      <Box data-pdf-section className="print-report-section" sx={{ display: "grid", gap: 2, mb: 2.5 }}>
        {reportData.tables.map((table) => <DataTable key={table.title} table={table} />)}
      </Box>
    </>
  );
}

function ServicesReportBody({ reportData }: { reportData: ReportData }) {
  const distributionChart = reportData.charts.find((chart) => chart.title === "Service Revenue Distribution");
  const performanceTable = reportData.tables.find((table) => table.title === "Service Performance");
  const supportingCharts = reportData.charts.filter((chart) => chart.title !== "Service Revenue Distribution");
  const serviceColorMap = distributionChart ? createServiceColorMap(distributionChart) : new Map<string, string>();
  const distributionData = distributionChart?.data ?? [];
  const hasData = distributionData.some((row) => Number(row.revenue ?? 0) > 0);

  return (
    <>
      <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Service Performance</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(240px, 0.3fr) minmax(0, 0.7fr)" }, gap: { xs: 2.5, md: 3 }, alignItems: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, color: "#666", fontWeight: 800, mb: 1, textAlign: "center" }}>Revenue Distribution</Typography>
            {!hasData ? (
              <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>No data available for the selected period.</Typography>
            ) : (
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <PieChart width={260} height={220}>
                  <Pie data={distributionData} dataKey="revenue" nameKey="service" cx={130} cy={110} innerRadius={62} outerRadius={94} paddingAngle={2}>
                    {distributionData.map((row) => <Cell key={String(row.service)} fill={serviceColorMap.get(String(row.service)) ?? SERVICES_CHART_COLORS[0]} />)}
                  </Pie>
                  <Tooltip content={<ReportTooltip />} />
                </PieChart>
              </Box>
            )}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            {performanceTable ? <DataTable table={performanceTable} serviceColorMap={serviceColorMap} hideTitle /> : <Typography sx={{ fontSize: 13, color: "#777" }}>No performance data available for the selected period.</Typography>}
          </Box>
        </Box>
      </Box>
      <Box data-pdf-section className="print-report-section print-report-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
        {supportingCharts.map((chart) => <ChartCard key={chart.title} chart={chart} services />)}
      </Box>
    </>
  );
}

function salesSourceColor(source: string): string {
  return source.toLowerCase().includes("booking") ? SALES_CHART_COLORS.booking : SALES_CHART_COLORS.walkin;
}

function salesPaymentColor(method: string): string {
  const normalized = method.toLowerCase();
  if (normalized.includes("cash") && !normalized.includes("gcash")) return SALES_CHART_COLORS.cash;
  if (normalized.includes("gcash")) return SALES_CHART_COLORS.gcash;
  return SALES_CHART_COLORS.online;
}

function SalesSourceCard({ revenueChart, transactionChart }: { revenueChart?: ReportChart; transactionChart?: ReportChart }) {
  const revenueData = revenueChart?.data ?? [];
  const transactionData = transactionChart?.data ?? [];
  const transactionBySource = new Map(transactionData.map((row) => [String(row.source), Number(row.transactions ?? 0)]));
  const totalRevenue = revenueData.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
  const hasData = revenueData.some((row) => Number(row.revenue ?? 0) > 0 || Number(row.transactions ?? 0) > 0);

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff" }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Sales by Source</Typography>
      {!hasData ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>No data available for the selected period.</Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.35fr) minmax(240px, 0.65fr)" }, gap: 2.5, alignItems: "center" }}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="source" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `₱${Number(value).toLocaleString()}`} />
              <Tooltip content={<ReportTooltip />} />
              <Bar dataKey="revenue" name="Revenue">
                {revenueData.map((row) => <Cell key={String(row.source)} fill={salesSourceColor(String(row.source))} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ display: "grid", gap: 1.2 }}>
            {revenueData.map((row) => {
              const source = String(row.source);
              const revenue = Number(row.revenue ?? 0);
              return (
                <Box key={source} sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.4, bgcolor: "#fafafa" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.7 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: salesSourceColor(source) }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{source}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: "#555" }}>{formatPeso(revenue)}</Typography>
                  <Typography sx={{ fontSize: 12, color: "#555" }}>{(transactionBySource.get(source) ?? 0).toLocaleString()} transactions</Typography>
                  <Typography sx={{ fontSize: 12, color: "#555" }}>{totalRevenue ? ((revenue / totalRevenue) * 100).toFixed(1) : "0.0"}% of revenue</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function SalesPaymentMethodCard({ chart, table }: { chart?: ReportChart; table?: ReportTable }) {
  const chartData = chart?.data ?? [];
  const rows = table?.rows ?? [];
  const hasData = rows.some((row) => Number(row.amount ?? 0) > 0 || Number(row.count ?? 0) > 0);

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Payments by Method</Typography>
      {!hasData ? (
        <Typography sx={{ fontSize: 13, color: "#777", py: 4, textAlign: "center" }}>
          No payment method data available for the selected period.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.35fr) minmax(260px, 0.65fr)" }, gap: 2.5, alignItems: "center" }}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="method" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `₱${Number(value).toLocaleString()}`} />
              <Tooltip content={<ReportTooltip />} />
              <Bar dataKey="amount" name="Amount Collected">
                {chartData.map((row) => <Cell key={String(row.method)} fill={salesPaymentColor(String(row.method))} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ display: "grid", gap: 1.2 }}>
            {rows.map((row) => (
              <Box key={String(row.method)} sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.4, bgcolor: "#fafafa" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.7 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: salesPaymentColor(String(row.method)) }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{row.method}</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{formatPeso(Number(row.amount ?? 0))}</Typography>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{Number(row.count ?? 0).toLocaleString()} payments</Typography>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{Number(row.share ?? 0).toLocaleString()}%</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function getSalesMetric(reportData: ReportData, label: string): ReportMetric {
  return reportData.metrics.find((metric) => metric.label === label) ?? { label, value: 0, numericValue: 0, kind: "money" };
}

function SalesRevenueBreakdown({ reportData }: { reportData: ReportData }) {
  const salesTotalRows = [
    ["VAT-exclusive subtotal", "VAT-exclusive subtotal"],
    ["Discounts", "Total Discounts"],
    ["Total Revenue", "Total Revenue"],
  ] as const;
  const vatRows = [
    ["VAT amount", "VAT amount"],
    ["Revenue excluding VAT", "Revenue excluding VAT"],
  ] as const;
  const vatRate = getSalesMetric(reportData, "Configured VAT rate");

  const renderRows = (rows: readonly (readonly [string, string])[]) => rows.map(([label, metricLabel]) => {
    const metric = getSalesMetric(reportData, metricLabel);
    const isTotal = label === "Total Revenue";
    const isDiscount = label === "Discounts";
    return (
      <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, borderBottom: isTotal ? "2px solid #111" : "1px solid #eee", pt: 0.65, pb: 0.8 }}>
        <Typography sx={{ fontSize: isTotal ? 13 : 12, color: isTotal ? "#111" : "#666", fontWeight: isTotal ? 900 : 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: isTotal ? 18 : 13, color: isTotal ? "#111" : "#333", fontWeight: isTotal ? 900 : 800, textAlign: "right", whiteSpace: "nowrap" }}>
          {isDiscount && Number(metric.numericValue ?? metric.value) > 0 ? `-${formatMetric({ ...metric, kind: "money" })}` : formatMetric({ ...metric, kind: "money" })}
        </Typography>
      </Box>
    );
  });

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1.5 }}>Revenue Breakdown</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: { xs: 2.5, md: 4 } }}>
        <Box>
          <Typography sx={{ fontSize: 12, color: "#333", fontWeight: 900, mb: 0.7 }}>Sales Total</Typography>
          <Box sx={{ display: "grid", gap: 0.35 }}>{renderRows(salesTotalRows)}</Box>
        </Box>
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, mb: 0.7 }}>
            <Typography sx={{ fontSize: 12, color: "#333", fontWeight: 900 }}>VAT Breakdown</Typography>
            <Typography sx={{ fontSize: 11, color: SALES_CHART_COLORS.vat, fontWeight: 800 }}>VAT rate {formatMetric({ ...vatRate, kind: "percent" })}</Typography>
          </Box>
          <Box sx={{ display: "grid", gap: 0.35 }}>{renderRows(vatRows)}</Box>
          <Typography sx={{ fontSize: 11, color: "#777", mt: 1.2 }}>Revenue excluding VAT represents Total Revenue less the VAT component.</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function SalesTransactionValueCard({ reportData }: { reportData: ReportData }) {
  const values = ["Average Transaction Value", "Highest Transaction Value", "Lowest Transaction Value"];
  return (
    <Box data-pdf-section className="print-report-section print-report-card print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1.5 }}>Transaction Value</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.2 }}>
        {values.map((label) => {
          const metric = getSalesMetric(reportData, label);
          return <Box key={label} sx={{ bgcolor: "#fafafa", border: "1px solid #eee", borderRadius: 1, p: 1.3 }}><Typography sx={{ fontSize: 11, color: "#777", fontWeight: 700 }}>{label.replace(" Transaction Value", "")}</Typography><Typography sx={{ fontSize: 16, fontWeight: 800, mt: 0.5 }}>{formatMetric({ ...metric, kind: "money" })}</Typography></Box>;
        })}
      </Box>
    </Box>
  );
}

function SalesReportBody({ reportData }: { reportData: ReportData }) {
  const revenueChart = reportData.charts.find((chart) => chart.title === "Revenue over time");
  const transactionChart = reportData.charts.find((chart) => chart.title === "Transactions over time");
  const sourceRevenueChart = reportData.charts.find((chart) => chart.title === "Walk-in vs Booking revenue");
  const sourceTransactionChart = reportData.charts.find((chart) => chart.title === "Walk-in vs Booking transaction count");
  const paymentChart = reportData.charts.find((chart) => chart.title === "Payments by Method");
  const paymentTable = reportData.tables.find((table) => table.title === "Payment Method Summary");
  const salesBreakdown = reportData.tables.find((table) => table.title === "Sales Breakdown");

  return (
    <>
      <Box data-pdf-section className="print-report-section print-report-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
        {[revenueChart, transactionChart].filter((chart): chart is ReportChart => Boolean(chart)).map((chart) => <ChartCard key={chart.title} chart={chart} sales />)}
      </Box>
      <Box className="print-report-section print-report-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
        <SalesSourceCard revenueChart={sourceRevenueChart} transactionChart={sourceTransactionChart} />
        <SalesPaymentMethodCard chart={paymentChart} table={paymentTable} />
      </Box>
      <SalesRevenueBreakdown reportData={reportData} />
      <SalesTransactionValueCard reportData={reportData} />
      {salesBreakdown && (
        <Box data-pdf-section className="print-report-section" sx={{ mb: 2.5 }}>
          <DataTable table={salesBreakdown} />
        </Box>
      )}
    </>
  );
}

function DataTable({ table, serviceColorMap, hideTitle = false }: { table: ReportTable; serviceColorMap?: Map<string, string>; hideTitle?: boolean }) {
  const compactServiceTable = Boolean(serviceColorMap);
  const serviceHeaderLabels: Record<string, string> = {
    revenueRank: "Rev. Rank",
    volumeRank: "Vol. Rank",
    revenueShare: "Share",
    averageRevenue: "Avg. Revenue",
  };
  const serviceColumnWidths: Record<string, string> = {
    revenueRank: "10%",
    volumeRank: "10%",
    service: "24%",
    count: "11%",
    revenue: "15%",
    revenueShare: "12%",
    averageRevenue: "18%",
  };

  if (!table.rows.length) {
    return (
      <Box className="print-report-card print-report-table print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff" }}>
        {!hideTitle && <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>{table.title}</Typography>}
        <Typography sx={{ color: "#777", fontSize: 13 }}>No data available for the selected period.</Typography>
      </Box>
    );
  }

  return (
    <Box className="print-report-card print-report-table" sx={{ border: compactServiceTable ? "none" : "1px solid #e0e0e0", borderRadius: compactServiceTable ? 0 : 2, p: compactServiceTable ? 0 : 2.5, bgcolor: "#fff", overflowX: { xs: compactServiceTable ? "auto" : "auto", md: compactServiceTable ? "visible" : "auto" } }}>
      {!hideTitle && <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1.5 }}>{table.title}</Typography>}
      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", tableLayout: compactServiceTable ? { xs: "auto", md: "fixed" } : "auto", minWidth: compactServiceTable ? { xs: 620, md: 0 } : 680 }}>
        <Box component="thead" sx={{ display: "table-header-group" }}>
          <Box component="tr">
            {table.columns.map((column) => (
              <Box component="th" key={column.key} sx={{ width: compactServiceTable ? { md: serviceColumnWidths[column.key] } : undefined, textAlign: column.kind === "money" || column.kind === "number" || column.kind === "percent" ? "right" : "left", fontSize: 11, color: "#777", borderBottom: "1px solid #eee", py: 0.8, px: compactServiceTable ? 0.45 : undefined, fontWeight: 800, whiteSpace: "nowrap" }}>
                {compactServiceTable ? serviceHeaderLabels[column.key] ?? column.label : column.label}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {table.rows.slice(0, 80).map((row, index) => (
            <Box component="tr" key={index}>
              {table.columns.map((column) => (
                <Box component="td" key={column.key} sx={{ textAlign: column.kind === "money" || column.kind === "number" || column.kind === "percent" ? "right" : "left", fontSize: 12, borderBottom: "1px solid #f2f2f2", py: 0.8, px: compactServiceTable ? 0.45 : undefined, verticalAlign: "top", whiteSpace: compactServiceTable && column.key === "service" ? { xs: "normal", md: "nowrap" } : "nowrap" }}>
                  {serviceColorMap && column.key === "service" && <Box component="span" sx={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", bgcolor: serviceColorMap.get(String(row[column.key] ?? "")) ?? SERVICES_CHART_COLORS[0], mr: 0.8 }} />}
                  {formatValue(row[column.key], column.kind)}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default function ReportsPage() {
  const today = new Date();
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("summary");
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [leftMonth, setLeftMonth] = useState(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const [rightMonth, setRightMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [picking, setPicking] = useState<"start" | "end">("start");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportRequest, setReportRequest] = useState<ReportRequest | null>(null);
  const [pendingReport, setPendingReport] = useState<PendingReportRequest | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [aiUsageOpen, setAiUsageOpen] = useState(false);
  const [reportGeneratedAt, setReportGeneratedAt] = useState<Date | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [notice, setNotice] = useState<{ message: string; severity: "success" | "error" | "info" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatCostEstimate, setChatCostEstimate] = useState<ChatCostEstimateResponse | null>(null);
  const [chatCostLoading, setChatCostLoading] = useState(false);
  const [chatCostError, setChatCostError] = useState("");
  const chatCostRequestId = useRef(0);
  const reportRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const chatReportContext = useMemo(() => reportData ? buildChatReportContext(reportData) : null, [reportData]);
  const chatReportContextJson = useMemo(() => chatReportContext ? JSON.stringify(chatReportContext) : "", [chatReportContext]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/user/role");
      const data = await res.json();
      if (!data.accessibleTabs?.includes("reports")) router.push("/unauthorized");
    };
    init();
  }, [router, supabase]);

  useEffect(() => {
    document.body.classList.add("admin-reports-page");
    return () => document.body.classList.remove("admin-reports-page");
  }, []);

  const { data: liveRawData } = useQuery({
    queryKey: ["adminReportsData", reportRequest?.from, reportRequest?.to, reportRequest?.reportType],
    queryFn: async () => {
      if (!reportRequest) return null;
      const params = new URLSearchParams({
        from: reportRequest.from,
        to: reportRequest.to,
        dateRange: reportRequest.dateRange,
        reportType: reportRequest.reportType,
      });
      const res = await fetch(`/api/admin/reports/data?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refresh report data.");
      return data as ReportData;
    },
    enabled: Boolean(reportRequest && reportData),
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!liveRawData || !reportData) return;
    const timer = window.setTimeout(() => {
      setReportData((current) => current ? { ...liveRawData, ai: current.ai } : current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [liveRawData, reportData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  useEffect(() => {
    const prompt = chatInput.trim();
    const requestId = ++chatCostRequestId.current;
    if (!prompt || !chatReportContextJson) {
      const resetTimer = window.setTimeout(() => {
        if (requestId === chatCostRequestId.current) {
          setChatCostEstimate(null);
          setChatCostError("");
          setChatCostLoading(false);
        }
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      setChatCostLoading(true);
      setChatCostError("");
      try {
        const reportContext = JSON.parse(chatReportContextJson) as ReturnType<typeof buildChatReportContext>;
        const messages = [...chatMsgs.map((m) => ({ role: m.role, content: m.text })), { role: "user" as const, content: prompt }];
        const body = JSON.stringify({ reportData: reportContext, messages });
        const res = await fetch("/api/admin/reports/chat/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body,
        });
        const data = (await res.json()) as Partial<ChatCostEstimateResponse> & { error?: string };
        if (!res.ok) throw new Error(data.error || `Estimate request failed (${res.status}).`);
        const regular = data.regular;
        const deep = data.deep;
        const validEstimate = regular && deep
          && Number.isFinite(regular.estimatedTotalCostPHP)
          && Number.isFinite(deep.estimatedTotalCostPHP)
          && Number.isFinite(regular.estimatedTotalCostUSD)
          && Number.isFinite(deep.estimatedTotalCostUSD)
          && Number.isFinite(regular.estimatedTotalTokens)
          && Number.isFinite(deep.estimatedTotalTokens);
        if (!validEstimate) throw new Error("Estimate response was missing valid regular and deep cost data.");
        if (controller.signal.aborted || requestId !== chatCostRequestId.current) return;
        setChatCostEstimate(data as ChatCostEstimateResponse);
        setChatCostError("");
      } catch (error) {
        if (!controller.signal.aborted && requestId === chatCostRequestId.current) {
          console.error("CHAT COST ESTIMATE ERROR:", error);
          setChatCostEstimate(null);
          setChatCostError("Cost estimate temporarily unavailable.");
        }
      } finally {
        window.clearTimeout(timeout);
        if (requestId === chatCostRequestId.current) setChatCostLoading(false);
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [chatInput, chatMsgs, chatReportContextJson]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setLeftMonth(new Date(year, leftMonth.getMonth(), 1));
    setRightMonth(new Date(year, rightMonth.getMonth(), 1));
  };

  const handleNavigate = (side: "left" | "right", dir: -1 | 1) => {
    if (side === "left") setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() + dir, 1));
    else setRightMonth(new Date(rightMonth.getFullYear(), rightMonth.getMonth() + dir, 1));
  };

  const handleSelectDay = (clicked: Date) => {
    if (picking === "start" || (startDate && endDate)) {
      setStartDate(clicked);
      setEndDate(null);
      setPicking("end");
    } else {
      if (startDate && clicked < startDate) {
        setEndDate(startDate);
        setStartDate(clicked);
      } else setEndDate(clicked);
      setPicking("start");
    }
  };

  const makeDateRange = () => `${formatDate(startDate)} - ${formatDate(endDate)}`;

  const handleEstimateReport = async () => {
    if (!startDate || !endDate) return;
    const from = toISO(startDate);
    const to = toISO(endDate);
    const dateRange = makeDateRange();
    setEstimateLoading(true);
    setEstimateError("");
    setPendingReport(null);
    try {
      const params = new URLSearchParams({ from, to, dateRange, reportType: selectedReportType });
      const estimateRes = await fetch(`/api/admin/reports/estimate?${params.toString()}`, { cache: "no-store" });
      const estimate = (await estimateRes.json()) as ReportCostEstimate & { error?: string };
      if (!estimateRes.ok) throw new Error(estimate.error || "Failed to estimate report cost.");
      setPendingReport({ from, to, dateRange, reportType: selectedReportType, estimate });
    } catch (e) {
      console.error(e);
      setEstimateError(e instanceof Error ? e.message : "Failed to estimate report cost.");
    } finally {
      setEstimateLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) return;
    const from = toISO(startDate);
    const to = toISO(endDate);
    const dateRange = makeDateRange();
    const reportType = selectedReportType;
    setLoading(true);
    setReportData(null);
    setChatMsgs([]);
    setReportRequest(null);
    setPendingReport(null);
    try {
      const params = new URLSearchParams({ from, to, dateRange, reportType });
      const dataRes = await fetch(`/api/admin/reports/data?${params.toString()}`, { cache: "no-store" });
      const rawData = (await dataRes.json()) as ReportData & { error?: string };
      if (!dataRes.ok) throw new Error(rawData.error || "Failed to load report data.");

      let finalData: ReportData = rawData;
      try {
        const analyzeRes = await fetch("/api/admin/reports/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to, dateRange, reportType }),
        });
        const aiInsights = (await analyzeRes.json()) as AiInsightsPayload & { error?: string };
        if (analyzeRes.ok) finalData = mergeAI(rawData, aiInsights);
        else setNotice({ severity: "error", message: aiInsights.error || "AI analysis failed. Deterministic report data is still available." });
      } catch (error) {
        console.error("AI analysis failed:", error);
        setNotice({ severity: "error", message: "AI analysis failed. Deterministic report data is still available." });
      }

      setChatMsgs([{ role: "assistant", text: `Hi. I've analyzed the ${finalData.reportTitle} for ${dateRange}. What would you like to explore?` }]);
      setReportData(finalData);
      setReportRequest({ from, to, dateRange, reportType });
      setReportGeneratedAt(new Date());
    } catch (e) {
      console.error(e);
      setNotice({ severity: "error", message: e instanceof Error ? e.message : "Failed to generate report." });
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async (text?: string, deep = false) => {
    const msg = text ?? chatInput.trim();
    if (!msg || chatLoading || !reportData) return;
    setChatInput("");
    const newMsgs: ChatMsg[] = [...chatMsgs, { role: "user", text: msg }];
    setChatMsgs(newMsgs);
    setChatLoading(true);
    try {
      const res = await fetch("/api/admin/reports/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportData: chatReportContext ?? buildChatReportContext(reportData),
          reportRequest,
          deep,
          messages: newMsgs.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const data = await res.json();
      setChatMsgs((prev) => [...prev, { role: "assistant", text: data.reply ?? "Unable to generate a response." }]);
    } catch {
      setChatMsgs((prev) => [...prev, { role: "assistant", text: "Something went wrong." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const blob = new Blob([toCSV(reportData)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reportData.csv.filename || "report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!reportData || !reportRef.current || isExportingPdf) return;
    setIsExportingPdf(true);
    setReportGeneratedAt(new Date());
    try {
      await exportReportToPdf(reportRef.current, { filename: buildReportPdfFilename(reportRequest) });
      setNotice({ severity: "success", message: "Report exported as PDF." });
    } catch (error) {
      console.error("PDF EXPORT ERROR:", error);
      setNotice({ severity: "error", message: "Failed to export the report as PDF." });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintReport = () => {
    if (!reportData || !reportRef.current || typeof window === "undefined") return;
    setReportGeneratedAt(new Date());
    window.setTimeout(() => window.print(), 100);
  };

  const reportLabel = REPORT_OPTIONS.find((item) => item.value === selectedReportType)?.label ?? "Summary";

  if (reportData) {
    const generatedAtLabel = formatManilaDateTime(reportGeneratedAt ?? new Date());
    const barberColorMap = reportData.reportType === "barbers" ? createBarberColorMap(reportData.charts) : undefined;
    const primarySalesMetricLabels = new Set([
      "Total Revenue",
      "Completed Sales",
      "Average Transaction Value",
      "Total Discounts",
      "VAT amount",
    ]);
    const primaryAppointmentMetricLabels = new Set([
      "Total Appointments",
      "Completed",
      "Completion Rate",
      "Scheduled",
    ]);
    const primaryCustomerMetricLabels = new Set([
      "Total Unique Customers",
      "Repeat Customer Rate",
      "Average Spend per Customer",
      "Highest Spending Customer",
    ]);
    const primaryLoyaltyMetricLabels = new Set([
      "Total Loyalty Participants",
      "Rewards Earned",
      "Rewards Redeemed",
      "Redemption Rate",
    ]);
    const primaryDiscountMetricLabels = new Set([
      "Total Discount Amount Given",
      "Number of Discounted Transactions",
      "Percentage of Transactions with Discounts",
      "Revenue After Discounts",
    ]);
    const displayedMetrics = reportData.reportType === "sales"
      ? reportData.metrics.filter((metric) => primarySalesMetricLabels.has(metric.label))
      : reportData.reportType === "summary"
        ? reportData.metrics.filter((metric) => new Set([
          "Total Revenue",
          "Completed Transactions",
          "Average Transaction Value",
          "Completion Rate",
          "Total Appointments",
        ]).has(metric.label))
        : reportData.reportType === "appointments"
          ? reportData.metrics.filter((metric) => primaryAppointmentMetricLabels.has(metric.label))
          : reportData.reportType === "customers"
            ? reportData.metrics.filter((metric) => primaryCustomerMetricLabels.has(metric.label))
            : reportData.reportType === "loyalty"
              ? reportData.metrics.filter((metric) => primaryLoyaltyMetricLabels.has(metric.label))
              : reportData.reportType === "discounts"
                ? reportData.metrics.filter((metric) => primaryDiscountMetricLabels.has(metric.label))
      : reportData.metrics;
    const displayMetrics = reportData.reportType === "discounts"
      ? displayedMetrics.map((metric) => metric.label === "Number of Discounted Transactions"
        ? { ...metric, label: "Discounted Transactions", kind: "count" as const }
        : metric.label === "Percentage of Transactions with Discounts"
          ? { ...metric, label: "Discount Usage Rate", kind: "percent" as const }
          : metric.label === "Total Discount Amount Given"
            ? { ...metric, kind: "money" as const }
            : metric.label === "Revenue After Discounts"
              ? { ...metric, kind: "money" as const }
              : metric)
      : displayedMetrics;

    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1080, mx: "auto" }}>
        <Box className="no-print" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <IconButton size="small" onClick={() => setReportData(null)}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Reports</Typography>
        </Box>

        <Stack className="no-print" direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap", mt: 2, mb: 2.5 }}>
          <Button size="small" variant="outlined" onClick={handleExportCSV} disabled={loading || isExportingPdf} startIcon={<TableViewIcon fontSize="small" />} sx={{ ...reportActionButtonSx, borderColor: "text.primary", color: "text.primary" }}>Export CSV</Button>
          <Button size="small" variant="outlined" onClick={handleExportPDF} disabled={isExportingPdf || loading} startIcon={isExportingPdf ? <CircularProgress size={14} sx={{ color: "#111" }} /> : <PictureAsPdfIcon fontSize="small" />} sx={{ ...reportActionButtonSx, borderColor: "text.primary", color: "text.primary" }}>{isExportingPdf ? "Exporting PDF..." : "Export PDF"}</Button>
          <Button size="small" variant="outlined" onClick={handlePrintReport} disabled={loading || isExportingPdf} startIcon={<PrintIcon fontSize="small" />} sx={{ ...reportActionButtonSx, borderColor: "text.primary", color: "text.primary" }}>Print Report</Button>
          <Button size="small" variant="outlined" onClick={() => setAiUsageOpen(true)} sx={{ ...reportActionButtonSx, borderColor: "text.primary", color: "text.primary" }}>AI Usage</Button>
        </Stack>

        <Dialog open={aiUsageOpen} onClose={() => setAiUsageOpen(false)} fullWidth maxWidth="lg">
          <DialogTitle sx={{ fontWeight: 900 }}>AI Usage</DialogTitle>
          <DialogContent dividers><AIUsageDashboard compact /></DialogContent>
          <DialogActions><Button onClick={() => setAiUsageOpen(false)} sx={{ textTransform: "none", color: "#111", fontWeight: 800 }}>Close</Button></DialogActions>
        </Dialog>

        <Box ref={reportRef} className="print-only-report print-report print-report-layout" data-report-export-root="true" sx={{ bgcolor: "#fff", color: "#111", width: "100%", maxWidth: "100%" }}>
          <Box data-pdf-section className="print-report-section print-report-header print-avoid-break" sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>EstiloMo</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 16, mt: 0.5 }}>Reports and Analytics</Typography>
            <Typography sx={{ fontSize: 13, color: "#555", mt: 1 }}>Report Type: {reportData.reportTitle}</Typography>
            <Typography sx={{ fontSize: 13, color: "#555" }}>Period: {reportData.dateRange}</Typography>
            <Typography sx={{ fontSize: 13, color: "#555" }}>Generated: {generatedAtLabel}</Typography>
          </Box>

          {!reportData.hasData && (
            <Box data-pdf-section className="print-report-section print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, mb: 2.5, bgcolor: "#fff" }}>
              <Typography sx={{ color: "#777", fontSize: 14 }}>No data available for the selected period.</Typography>
            </Box>
          )}

          <Box data-pdf-section className="print-report-section print-report-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: reportData.reportType === "sales" || reportData.reportType === "summary" ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))", md: reportData.reportType === "sales" || reportData.reportType === "summary" || reportData.reportType === "services" ? "repeat(5, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))" }, gap: 2, mb: 2.5 }}>
            {displayMetrics.map((metric) => <StatCard key={metric.label} metric={metric} />)}
          </Box>

          {reportData.reportType === "summary" ? (
            <SummaryReportBody reportData={reportData} />
          ) : reportData.reportType === "sales" ? (
            <SalesReportBody reportData={reportData} />
          ) : reportData.reportType === "appointments" ? (
            <AppointmentsReportBody reportData={reportData} />
          ) : reportData.reportType === "services" ? (
            <ServicesReportBody reportData={reportData} />
          ) : reportData.reportType === "customers" ? (
            <CustomersReportBody reportData={reportData} />
          ) : reportData.reportType === "loyalty" ? (
            <LoyaltyReportBody reportData={reportData} />
          ) : reportData.reportType === "discounts" ? (
            <DiscountsReportBody reportData={reportData} />
          ) : (
            <>
              <Box data-pdf-section className="print-report-section print-report-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
                {reportData.charts.map((chart) => <ChartCard key={chart.title} chart={chart} services={reportData.reportType === "services"} barberColorMap={barberColorMap} />)}
              </Box>

              <Box data-pdf-section className="print-report-section" sx={{ display: "grid", gap: 2, mb: 2.5 }}>
                {reportData.tables.map((table) => <DataTable key={table.title} table={table} />)}
              </Box>
            </>
          )}

          <Box data-pdf-section className="print-report-section print-report-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
            <Box className="print-report-analysis print-avoid-break" sx={{ bgcolor: "#f9f9f9", border: "1px solid #e8e8e8", borderRadius: 1, p: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: "#555" }}><strong>AI Insight:</strong> {reportData.ai.insight || "No AI insight is available."}</Typography>
            </Box>
            <Box className="print-report-recommendation print-avoid-break" sx={{ bgcolor: "#f9f9f9", border: "1px solid #e8e8e8", borderRadius: 1, p: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: "#555" }}><strong>AI Recommendation:</strong> {reportData.ai.recommendation || "No AI recommendation is available."}</Typography>
            </Box>
          </Box>

          {(reportData.notes.length > 0 || reportData.sourceData) && (
            <Box data-pdf-section className="print-report-section print-report-card" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2, bgcolor: "#fff" }}>
              <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>Metric Definitions</Typography>
              {[reportData.sourceData.revenueDefinition, reportData.sourceData.customerDefinition, reportData.sourceData.barberAttribution, reportData.sourceData.paymentMethodDefinition, ...reportData.notes].map((note) => (
                <Typography key={note} sx={{ fontSize: 11, color: "#666", mb: 0.5 }}>{note}</Typography>
              ))}
            </Box>
          )}
        </Box>

        <Box className="no-print" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, overflow: "hidden", mt: 2.5 }}>
          <Box sx={{ bgcolor: "#111", px: 2.5, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, bgcolor: "#FBBC05", borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUpIcon sx={{ fontSize: 20, color: "#111" }} />
            </Box>
            <Box>
              <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Ask AI Anything</Typography>
              <Typography sx={{ color: "#aaa", fontSize: 11 }}>Get instant insights from your business data</Typography>
            </Box>
          </Box>
          <Box sx={{ bgcolor: "#fff", px: 2.5, pt: 2, pb: 1, minHeight: 320, maxHeight: 340, overflowY: "auto" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#555", mb: 1 }}>Quick questions:</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mb: 2 }}>
              {QUICK_QUESTIONS.map((q) => <Box key={q} onClick={() => handleChatSend(q)} sx={{ fontSize: 12, bgcolor: "#111", color: "#FBBC05", px: 1.5, py: 0.6, borderRadius: 5, cursor: "pointer", fontWeight: 500, "&:hover": { bgcolor: "#333" } }}>{q}</Box>)}
            </Box>
            {chatMsgs.map((m, i) => (
              <Box key={i} sx={{ mb: 1.5, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <Box sx={{ maxWidth: "80%", px: 2, py: 1.2, borderRadius: 2, fontSize: 13, lineHeight: 1.6, bgcolor: m.role === "user" ? "#111" : "#f3f3f3", color: m.role === "user" ? "#fff" : "#222", "& p": { margin: 0, mb: 0.8 }, "& ul, & ol": { mt: 0.5, mb: 0.8, pl: 2.5 }, "& p:last-child, & ul:last-child, & ol:last-child": { mb: 0 } }}>
                  {m.role === "assistant" ? <ReactMarkdown>{m.text}</ReactMarkdown> : m.text}
                </Box>
              </Box>
            ))}
            {chatLoading && <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}><CircularProgress size={14} sx={{ color: "#FBBC05" }} /><Typography sx={{ fontSize: 12, color: "#888" }}>Thinking...</Typography></Box>}
            <div ref={chatEndRef} />
          </Box>
          <Box sx={{ bgcolor: "#f4f4f4", px: 2, py: 1.2, display: "grid", gap: 0.8, borderTop: "1px solid #e0e0e0" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <input value={chatInput} onChange={(e) => { const value = e.target.value; setChatInput(value); setChatCostEstimate(null); setChatCostError(""); setChatCostLoading(false); }} onKeyDown={(e) => e.key === "Enter" && handleChatSend()} placeholder="Ask about this report..." style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#222" }} />
              <Button size="small" onClick={() => handleChatSend(undefined, true)} disabled={chatLoading || !chatInput.trim()} startIcon={chatLoading ? <CircularProgress size={12} sx={{ color: "#111" }} /> : <AutoAwesomeIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: 11, fontWeight: 600, textTransform: "none", color: "#111", bgcolor: "#FBBC05", px: 1.5, py: 0.6, borderRadius: 5, minWidth: "unset", whiteSpace: "nowrap", "&:hover": { bgcolor: "#f0b400" }, "&:disabled": { bgcolor: "#e0e0e0", color: "#aaa" } }}>Deep Analysis</Button>
              <IconButton size="small" onClick={() => handleChatSend()} disabled={chatLoading || !chatInput.trim()}><SendIcon fontSize="small" sx={{ color: chatInput.trim() ? "#111" : "#bbb" }} /></IconButton>
            </Box>
            {chatInput.trim() && (chatCostLoading || chatCostEstimate || chatCostError) && <Typography sx={{ fontSize: 11, color: chatCostError ? "#888" : "#666", lineHeight: 1.4 }}>{chatCostLoading && !chatCostEstimate ? "Estimating prompt cost..." : chatCostEstimate ? `This prompt will cost about ${formatCostPHP(chatCostEstimate.regular.estimatedTotalCostPHP)} with GPT-4o Mini. Deep Analysis may cost about ${formatCostPHP(chatCostEstimate.deep.estimatedTotalCostPHP)}.` : chatCostError}</Typography>}
          </Box>
        </Box>

        <Snackbar open={Boolean(notice)} autoHideDuration={3500} onClose={() => setNotice(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert onClose={() => setNotice(null)} severity={notice?.severity ?? "info"} variant="filled" sx={{ width: "100%" }}>{notice?.message}</Alert>
        </Snackbar>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Reports and Analytics</Typography>
      <Box sx={{ bgcolor: "#f4f4f4", border: "1px solid #e0e0e0", borderRadius: 2, p: 2, mb: 2.5 }}>
        <Typography sx={{ fontSize: 13, color: "#666", fontWeight: 700, mb: 1 }}>Report Type</Typography>
        <Select value={selectedReportType} onChange={(e) => setSelectedReportType(e.target.value as ReportType)} size="small" fullWidth sx={{ bgcolor: "#fff", fontSize: 14 }}>
          {REPORT_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </Select>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
        {[{ label: "Date From:", value: startDate }, { label: "Date To:", value: endDate }].map(({ label, value }) => (
          <Box key={label} sx={{ bgcolor: "#f4f4f4", border: "1px solid #e0e0e0", borderRadius: 2, px: 2, py: 1.2, minHeight: 42, display: "flex", alignItems: "center" }}>
            <Typography component="span" sx={{ fontSize: 14, color: "#666", mr: 1, fontWeight: 600 }}>{label}</Typography>
            <Typography component="span" sx={{ fontSize: 14, color: value ? "#111" : "#999" }}>{formatDate(value)}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
        <Typography sx={{ fontSize: 14, color: "#555" }}>Year:</Typography>
        <Select value={selectedYear} onChange={(e) => handleYearChange(Number(e.target.value))} size="small" sx={{ fontSize: 14, minWidth: 100 }}>
          {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </Select>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 3 }}>
        <Calendar monthDate={leftMonth} startDate={startDate} endDate={endDate} onNavigate={(dir) => handleNavigate("left", dir)} onSelectDay={handleSelectDay} />
        <Calendar monthDate={rightMonth} startDate={startDate} endDate={endDate} onNavigate={(dir) => handleNavigate("right", dir)} onSelectDay={handleSelectDay} />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button variant="contained" onClick={handleEstimateReport} disabled={!startDate || !endDate || loading || estimateLoading} startIcon={loading || estimateLoading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : undefined} sx={{ bgcolor: "#111", color: "#fff", px: 5, py: 1.4, fontSize: 14, fontWeight: 600, borderRadius: 2, textTransform: "none", "&:hover": { bgcolor: "#333" }, "&:disabled": { bgcolor: "#ccc", color: "#fff" } }}>
          {loading ? "Generating..." : estimateLoading ? "Estimating..." : `Estimate ${reportLabel} Report`}
        </Button>
      </Box>
      {estimateError && <Typography sx={{ mt: 2, textAlign: "center", color: "#b91c1c", fontSize: 13, fontWeight: 600 }}>{estimateError}</Typography>}

      <Dialog open={Boolean(pendingReport)} onClose={() => setPendingReport(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Confirm AI Report</DialogTitle>
        <DialogContent>
          {pendingReport && (
            <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
              <Box><Typography sx={{ fontSize: 13, color: "#777", mb: 0.5 }}>Report</Typography><Typography sx={{ fontSize: 16, fontWeight: 800 }}>{REPORT_OPTIONS.find((item) => item.value === pendingReport.reportType)?.label}</Typography></Box>
              <Box><Typography sx={{ fontSize: 13, color: "#777", mb: 0.5 }}>Date Range</Typography><Typography sx={{ fontSize: 16, fontWeight: 800 }}>{pendingReport.dateRange}</Typography></Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
                {[{ label: "Input Tokens", value: formatTokenCount(pendingReport.estimate.estimatedInputTokens) }, { label: "Max Output Tokens", value: formatTokenCount(pendingReport.estimate.estimatedOutputTokens) }, { label: "Estimated Total", value: formatTokenCount(pendingReport.estimate.estimatedTotalTokens) }].map((item) => (
                  <Box key={item.label} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 1.5, bgcolor: "#fafafa" }}>
                    <Typography sx={{ fontSize: 12, color: "#777", mb: 0.5 }}>{item.label}</Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 900 }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2, display: "grid", gap: 1 }}>
                {[["Model", pendingReport.estimate.model], ["Input Cost", formatCostUSD(pendingReport.estimate.estimatedInputCostUSD)], ["Output Cost Cap", formatCostUSD(pendingReport.estimate.estimatedOutputCostUSD)], ["Estimated Total", formatCostUSD(pendingReport.estimate.estimatedTotalCostUSD)], ["Estimated Total PHP", formatCostPHP(pendingReport.estimate.estimatedTotalCostPHP)]].map(([label, value]) => (
                  <Box key={label} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                    <Typography sx={{ fontSize: 13, color: "#555", fontWeight: label.includes("Total") ? 900 : 400 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{value}</Typography>
                  </Box>
                ))}
                <Typography sx={{ fontSize: 12, color: "#777", mt: 0.5 }}>Uses PHP {pendingReport.estimate.exchangeRatePHP.toFixed(4)} per USD. Actual output tokens and final cost are saved after generation.</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPendingReport(null)} disabled={loading} sx={{ textTransform: "none", color: "#555", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={handleGenerateReport} disabled={loading} sx={{ textTransform: "none", bgcolor: "#111", color: "#FBBC05", fontWeight: 900, "&:hover": { bgcolor: "#222" } }}>{loading ? "Generating..." : "Confirm and Generate"}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={3500} onClose={() => setNotice(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setNotice(null)} severity={notice?.severity ?? "info"} variant="filled" sx={{ width: "100%" }}>{notice?.message}</Alert>
      </Snackbar>
    </Box>
  );
}
