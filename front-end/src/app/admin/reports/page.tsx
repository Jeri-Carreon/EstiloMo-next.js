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

function ChartCard({ chart }: { chart: ReportChart }) {
  const hasData = chart.data.some((row) => chart.series.some((series) => Number(row[series.key] ?? 0) > 0));

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
              {chart.data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
            {chart.series.map((series, index) => <Bar key={series.key} dataKey={series.key} name={series.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ReportTooltip />} />
            {chart.series.map((series, index) => <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />)}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}

function SummaryTrendCard({ chart }: { chart?: ReportChart }) {
  const data = chart?.data ?? [];
  const hasData = data.some((row) => Number(row.revenue ?? 0) > 0 || Number(row.transactions ?? 0) > 0);

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Revenue and Transaction Trend</Typography>
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
              <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke={PIE_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="transactions" type="monotone" dataKey="transactions" name="Transactions" stroke={PIE_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
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
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: PIE_COLORS[index % PIE_COLORS.length], mt: 0.45 }} />
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

function SummarySourceCard({ chart, table }: { chart?: ReportChart; table?: ReportTable }) {
  const chartData = chart?.data ?? [];
  const rows = table?.rows?.length ? table.rows : chartData;
  const hasData = rows.some((row) => Number(row.revenue ?? 0) > 0 || Number(row.transactions ?? 0) > 0);

  return (
    <Box data-pdf-section className="print-report-section print-report-card print-report-chart print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Revenue by Source</Typography>
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
              <Bar dataKey="revenue" name="Revenue" fill={PIE_COLORS[0]}>
                {chartData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ display: "grid", gap: 1.2 }}>
            {rows.map((row, index) => (
              <Box key={String(row.source)} sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.4, bgcolor: "#fafafa" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.7 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{row.source}</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{formatPeso(Number(row.revenue ?? 0))}</Typography>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{Number(row.transactions ?? 0).toLocaleString()} transactions</Typography>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{Number(row.revenueShare ?? 0).toLocaleString()}%</Typography>
              </Box>
            ))}
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

  return (
    <>
      <SummaryTrendCard chart={trendChart} />
      <SummaryServiceDistributionCard chart={serviceChart} />
      <SummarySourceCard chart={sourceChart} table={sourceTable} />
    </>
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
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="amount" name="Amount Collected" fill={PIE_COLORS[0]}>
                {chartData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ display: "grid", gap: 1.2 }}>
            {rows.map((row, index) => (
              <Box key={String(row.method)} sx={{ border: "1px solid #eee", borderRadius: 1, p: 1.4, bgcolor: "#fafafa" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.7 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: PIE_COLORS[index % PIE_COLORS.length] }} />
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

function SalesReportBody({ reportData }: { reportData: ReportData }) {
  const paymentChart = reportData.charts.find((chart) => chart.title === "Payments by Method");
  const paymentTable = reportData.tables.find((table) => table.title === "Payment Method Summary");
  const salesBreakdown = reportData.tables.find((table) => table.title === "Sales Breakdown");
  const salesCharts = reportData.charts.filter((chart) => chart.title !== "Payments by Method");

  return (
    <>
      <Box data-pdf-section className="print-report-section print-report-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
        {salesCharts.map((chart) => <ChartCard key={chart.title} chart={chart} />)}
      </Box>
      <SalesPaymentMethodCard chart={paymentChart} table={paymentTable} />
      {salesBreakdown && (
        <Box data-pdf-section className="print-report-section" sx={{ mb: 2.5 }}>
          <DataTable table={salesBreakdown} />
        </Box>
      )}
    </>
  );
}

function DataTable({ table }: { table: ReportTable }) {
  if (!table.rows.length) {
    return (
      <Box className="print-report-card print-report-table print-avoid-break" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff" }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>{table.title}</Typography>
        <Typography sx={{ color: "#777", fontSize: 13 }}>No data available for the selected period.</Typography>
      </Box>
    );
  }

  return (
    <Box className="print-report-card print-report-table" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2.5, bgcolor: "#fff", overflowX: "auto" }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1.5 }}>{table.title}</Typography>
      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
        <Box component="thead" sx={{ display: "table-header-group" }}>
          <Box component="tr">
            {table.columns.map((column) => (
              <Box component="th" key={column.key} sx={{ textAlign: column.kind === "money" || column.kind === "number" || column.kind === "percent" ? "right" : "left", fontSize: 11, color: "#777", borderBottom: "1px solid #eee", py: 0.8, pr: 1, fontWeight: 800 }}>
                {column.label}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {table.rows.slice(0, 80).map((row, index) => (
            <Box component="tr" key={index}>
              {table.columns.map((column) => (
                <Box component="td" key={column.key} sx={{ textAlign: column.kind === "money" || column.kind === "number" || column.kind === "percent" ? "right" : "left", fontSize: 12, borderBottom: "1px solid #f2f2f2", py: 0.8, pr: 1, verticalAlign: "top" }}>
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
  const reportRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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
    if (!prompt || !reportData) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setChatCostLoading(true);
      try {
        const messages = [...chatMsgs.map((m) => ({ role: m.role, content: m.text })), { role: "user" as const, content: prompt }];
        const res = await fetch("/api/admin/reports/chat/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ reportData, messages }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to estimate chat cost.");
        setChatCostEstimate(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("CHAT COST ESTIMATE ERROR:", error);
          setChatCostEstimate(null);
        }
      } finally {
        if (!controller.signal.aborted) setChatCostLoading(false);
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [chatInput, chatMsgs, reportData]);

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
          reportData,
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

          <Box data-pdf-section className="print-report-section print-report-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 2.5 }}>
            {reportData.metrics.map((metric) => <StatCard key={metric.label} metric={metric} />)}
          </Box>

          {reportData.reportType === "summary" ? (
            <SummaryReportBody reportData={reportData} />
          ) : (
            <>
              <Box data-pdf-section className="print-report-section print-report-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
                {reportData.charts.map((chart) => <ChartCard key={chart.title} chart={chart} />)}
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
              {[reportData.sourceData.revenueDefinition, reportData.sourceData.customerDefinition, reportData.sourceData.barberAttribution, reportData.sourceData.peakHourDefinition, ...reportData.notes].map((note) => (
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
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleChatSend()} placeholder="Ask about this report..." style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#222" }} />
              <Button size="small" onClick={() => handleChatSend(undefined, true)} disabled={chatLoading || !chatInput.trim()} startIcon={chatLoading ? <CircularProgress size={12} sx={{ color: "#111" }} /> : <AutoAwesomeIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: 11, fontWeight: 600, textTransform: "none", color: "#111", bgcolor: "#FBBC05", px: 1.5, py: 0.6, borderRadius: 5, minWidth: "unset", whiteSpace: "nowrap", "&:hover": { bgcolor: "#f0b400" }, "&:disabled": { bgcolor: "#e0e0e0", color: "#aaa" } }}>Deep Analysis</Button>
              <IconButton size="small" onClick={() => handleChatSend()} disabled={chatLoading || !chatInput.trim()}><SendIcon fontSize="small" sx={{ color: chatInput.trim() ? "#111" : "#bbb" }} /></IconButton>
            </Box>
            {chatInput.trim() && <Typography sx={{ fontSize: 11, color: "#666", lineHeight: 1.4 }}>{chatCostLoading && !chatCostEstimate ? "Estimating prompt cost..." : chatCostEstimate ? `This prompt will cost about ${formatCostPHP(chatCostEstimate.regular.estimatedTotalCostPHP)} with GPT-4o Mini. Deep Analysis may cost about ${formatCostPHP(chatCostEstimate.deep.estimatedTotalCostPHP)}.` : "Cost estimate unavailable."}</Typography>}
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
