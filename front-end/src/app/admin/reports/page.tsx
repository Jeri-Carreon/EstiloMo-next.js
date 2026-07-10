"use client";

import AIUsageDashboard from "@/components/admin/AIUsageDashboard";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SendIcon from "@mui/icons-material/Send";
import {
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
  Typography,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"; // deep analysis icon
import ReactMarkdown from "react-markdown";
import { PieChart, Pie, Cell } from "recharts";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceRow {
  name: string;
  color: string;
  count: number;
  revenue: number;
}

interface WeekPoint {
  week: string;
  revenue: number;
  transactions: number;
}

interface InsightCard {
  icon: string;
  title: string;
  body: string;
}

interface ReportData {
  dateRange: string;
  insights: InsightCard[];
  totalRevenue: number;
  avgRevenuePerDay: number;
  completedTransactions: number;
  completionRate: number;
  revenueTrend: number;
  avgTrend: number;
  apptTrend: number;
  rateTrend: number;
  weeklyData: WeekPoint[];
  weeklyInsight: string;
  services: ServiceRow[];
  serviceRecommendation: string;
  dailyRevenue: { date: string; revenue: number; transactions: number }[];
}

type RawServiceRow = Omit<ServiceRow, "color">;

type RawReportData = {
  totalRevenue: number;
  avgRevenuePerDay: number;
  completedTransactions: number;
  completionRate: number;
  revenueTrend?: number;
  avgTrend?: number;
  apptTrend?: number;
  rateTrend?: number;
  weeklyData?: WeekPoint[];
  services?: RawServiceRow[];
  dailyRevenue?: { date: string; revenue: number; transactions: number }[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

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
const PIE_COLORS = ["#4285F4", "#FBBC05", "#EA4335", "#34A853", "#AB47BC"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sameDay(a: Date | null, b: Date | null): boolean {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  return [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
}

function toCSV(data: ReportData): string {
  // Escape a cell: wrap in quotes if it contains commas, quotes, or newlines
  const cell = (value: string | number) => {
    const str = String(value);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const row = (...cells: (string | number)[]) => cells.map(cell).join(",");

  const lines: string[] = [
    row("AI Business Data Report"),
    row("Date Range", data.dateRange),
    row(""),
    row("Summary"),
    row("Total Revenue", `PHP ${data.totalRevenue.toLocaleString()}`),
    row("Avg Revenue Per Day", `PHP ${data.avgRevenuePerDay.toLocaleString()}`),
    row("Completed Transactions", data.completedTransactions),
    row("Completion Rate", `${data.completionRate}%`),
    row(""),
    row("Weekly Revenue & Transactions"),
    row("Week", "Revenue", "Transactions"),
    ...data.weeklyData.map((w) =>
      row(w.week, `PHP ${w.revenue.toLocaleString()}`, w.transactions),
    ),
    row(""),
    row("Service Revenue Distribution"),
    row("Service", "Count", "Revenue"),
    ...data.services.map((s) =>
      row(s.name, s.count, `PHP ${s.revenue.toLocaleString()}`),
    ),
  ];

  // BOM ensures Excel opens the file as UTF-8, fixing special character encoding
  return "\uFEFF" + lines.join("\r\n");
}

// ─── Calendar sub-component ───────────────────────────────────────────────────

interface CalendarProps {
  monthDate: Date;
  startDate: Date | null;
  endDate: Date | null;
  onNavigate: (dir: -1 | 1) => void;
  onSelectDay: (date: Date) => void;
}

const Calendar = ({
  monthDate,
  startDate,
  endDate,
  onNavigate,
  onSelectDay,
}: CalendarProps) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const today = new Date();
  const calDays = buildCalDays(year, month);

  const getDayState = (day: number) => {
    const dt = new Date(year, month, day);
    return {
      isStart: sameDay(dt, startDate),
      isEnd: sameDay(dt, endDate),
      isToday: sameDay(dt, today),
      isInRange: !!(startDate && endDate && dt > startDate && dt < endDate),
      dt,
    };
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
        <IconButton size="small" onClick={() => onNavigate(-1)} sx={{ p: 0.5 }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography
          sx={{ flex: 1, fontWeight: 500, fontSize: 15, textAlign: "center" }}
        >
          {MONTHS[month]}
        </Typography>
        <IconButton size="small" onClick={() => onNavigate(1)} sx={{ p: 0.5 }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          border: "1px solid #d0d0d0",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#fff",
        }}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {WEEKDAYS.map((d) => (
            <Box
              key={d}
              sx={{
                textAlign: "center",
                py: 0.8,
                fontSize: 11,
                fontWeight: 600,
                color: "#666",
                borderRight: "1px solid #e0e0e0",
                borderBottom: "1px solid #d0d0d0",
                "&:last-child": { borderRight: "none" },
              }}
            >
              {d}
            </Box>
          ))}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {calDays.map((day, index) => {
            if (!day)
              return (
                <Box
                  key={`empty-${index}`}
                  sx={{
                    minHeight: 36,
                    borderRight: "1px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                    bgcolor: "#f0f0f0",
                    "&:nth-of-type(7n)": { borderRight: "none" },
                  }}
                />
              );

            const { isStart, isEnd, isToday, isInRange, dt } = getDayState(day);
            const bgColor =
              isStart || isEnd
                ? "#111"
                : isInRange
                  ? "#ebebeb"
                  : isToday
                    ? "#f5f5f5"
                    : "#fafafa";
            const textColor = isStart || isEnd ? "#fff" : "#222";

            return (
              <Box
                key={index}
                onClick={() => onSelectDay(dt)}
                sx={{
                  minHeight: 36,
                  borderRight: "1px solid #e0e0e0",
                  borderBottom: "1px solid #e0e0e0",
                  p: "6px 6px 4px",
                  bgcolor: bgColor,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                  "&:nth-of-type(7n)": { borderRight: "none" },
                  "&:hover": { filter: "brightness(0.94)" },
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: isStart || isEnd ? 600 : 400,
                    color: textColor,
                    lineHeight: 1,
                  }}
                >
                  {day}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  trend,
}: {
  icon: string;
  value: string;
  label: string;
  trend: number;
}) {
  const positive = trend >= 0;
  return (
    <Box
      sx={{
        border: "1px solid #e0e0e0",
        borderRadius: 2,
        p: 2,
        bgcolor: "#fff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 1,
        }}
      >
        <Typography sx={{ fontSize: 22 }}>{icon}</Typography>
        <Typography
          sx={{
            fontSize: 12,
            color: positive ? "#16a34a" : "#dc2626",
            fontWeight: 600,
          }}
        >
          {positive ? "↑" : "↓"} {Math.abs(trend)}%
        </Typography>
      </Box>
      <Typography
        sx={{ fontSize: 24, fontWeight: 700, color: "#111", lineHeight: 1.1 }}
      >
        {value}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "#888", mt: 0.5 }}>
        {label}
      </Typography>
    </Box>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────────

function InsightCard({ icon, title, body }: InsightCard) {
  return (
    <Box
      sx={{
        border: "1px solid #e0e0e0",
        borderRadius: 2,
        p: 2.5,
        bgcolor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: 22 }}>{icon}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{title}</Typography>
      </Box>
      <Typography sx={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
        {body}
      </Typography>
    </Box>
  );
}

// ─── Custom tooltip for line chart ───────────────────────────────────────────

type CustomTooltipProps = {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
};

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        bgcolor: "#fff",
        border: "1px solid #d0d0d0",
        borderRadius: 1,
        p: 1.5,
        fontSize: 12,
      }}
    >
      <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: 12 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 12 }}>
        Revenue: {payload[0]?.value?.toLocaleString()}
      </Typography>
      <Typography sx={{ fontSize: 12 }}>
        Transactions: {payload[1]?.value}
      </Typography>
    </Box>
  );
}

// ─── Chat message type ────────────────────────────────────────────────────────

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

const QUICK_QUESTIONS = [
  "What's driving my revenue growth?",
  "How can I reduce no-shows?",
  "Which days are most profitable?",
  "Which services should I upsell?",
];

type AiInsightsPayload = {
  insights?: InsightCard[];
  weeklyInsight?: string;
  serviceRecommendation?: string;
};

type ReportRequest = {
  from: string;
  to: string;
  dateRange: string;
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

type PendingReportRequest = ReportRequest & {
  estimate: ReportCostEstimate;
};

type ChatCostEstimate = {
  model: string;
  estimatedTotalCostPHP: number;
  estimatedTotalCostUSD: number;
  estimatedTotalTokens: number;
  isEstimate: boolean;
};

type ChatCostEstimateResponse = {
  regular: ChatCostEstimate;
  deep: ChatCostEstimate;
};

function buildReportData(
  rawData: RawReportData,
  dateRange: string,
  aiInsights: AiInsightsPayload = {},
): ReportData {
  const services = (rawData.services ?? []).map(
    (service, index) => ({
      ...service,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }),
  );

  return {
    dateRange,
    insights: aiInsights.insights ?? [],
    totalRevenue: rawData.totalRevenue,
    avgRevenuePerDay: rawData.avgRevenuePerDay,
    completedTransactions: rawData.completedTransactions,
    completionRate: rawData.completionRate,
    revenueTrend: rawData.revenueTrend ?? 0,
    avgTrend: rawData.avgTrend ?? 0,
    apptTrend: rawData.apptTrend ?? 0,
    rateTrend: rawData.rateTrend ?? 0,
    weeklyData: rawData.weeklyData ?? [],
    weeklyInsight: aiInsights.weeklyInsight ?? "",
    services,
    serviceRecommendation: aiInsights.serviceRecommendation ?? "",
    dailyRevenue: rawData.dailyRevenue ?? [],
  };
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  const today = new Date();

  // Calendar state
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [leftMonth, setLeftMonth] = useState(
    new Date(today.getFullYear(), today.getMonth() - 1, 1),
  );
  const [rightMonth, setRightMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [picking, setPicking] = useState<"start" | "end">("start");

  // Report state
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportRequest, setReportRequest] = useState<ReportRequest | null>(
    null,
  );
  const [pendingReport, setPendingReport] =
    useState<PendingReportRequest | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [aiUsageOpen, setAiUsageOpen] = useState(false);
  // session
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);

  // Chat state
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatCostEstimate, setChatCostEstimate] =
    useState<ChatCostEstimateResponse | null>(null);
  const [chatCostLoading, setChatCostLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/user/role");
      const data = await res.json();

      if (!["OWNER"].includes(data.role)) {
        router.push("/unauthorized");
        return;
      }
    };

    init();
  }, [router, supabase]);

  const { data: liveRawData } = useQuery({
    queryKey: ["adminReportsData", reportRequest?.from, reportRequest?.to],
    queryFn: async () => {
      if (!reportRequest) return null;

      const res = await fetch(
        `/api/admin/reports/data?from=${reportRequest.from}&to=${reportRequest.to}`,
        { cache: "no-store" },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to refresh report data.");
      }

      return data;
    },
    enabled: Boolean(reportRequest && reportData),
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!liveRawData || !reportRequest) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReportData((current) => {
      if (!current) return current;

      return buildReportData(liveRawData, current.dateRange, {
        insights: current.insights,
        weeklyInsight: current.weeklyInsight,
        serviceRecommendation: current.serviceRecommendation,
      });
    });
  }, [liveRawData, reportRequest]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  useEffect(() => {
    const prompt = chatInput.trim();

    if (!prompt || !reportData) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setChatCostLoading(true);
      try {
        const messages = [
          ...chatMsgs.map((m) => ({ role: m.role, content: m.text })),
          { role: "user" as const, content: prompt },
        ];
        const res = await fetch("/api/admin/reports/chat/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ reportData, messages }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to estimate chat cost.");
        }

        setChatCostEstimate(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("CHAT COST ESTIMATE ERROR:", error);
          setChatCostEstimate(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setChatCostLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [chatInput, chatMsgs, reportData]);

  // Calendar handlers
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setLeftMonth(new Date(year, leftMonth.getMonth(), 1));
    setRightMonth(new Date(year, rightMonth.getMonth(), 1));
  };

  const handleNavigate = (side: "left" | "right", dir: -1 | 1) => {
    if (side === "left")
      setLeftMonth(
        new Date(leftMonth.getFullYear(), leftMonth.getMonth() + dir, 1),
      );
    else
      setRightMonth(
        new Date(rightMonth.getFullYear(), rightMonth.getMonth() + dir, 1),
      );
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

  const handleEstimateReport = async () => {
    if (!startDate || !endDate) return;

    const from = toISO(startDate);
    const to = toISO(endDate);
    const dateRange = `${formatDate(startDate)} â€“ ${formatDate(endDate)}`;
    setEstimateLoading(true);
    setEstimateError("");
    setPendingReport(null);
    const hasCorruptSeparator = Array.from(dateRange).some(
      (char) => char.charCodeAt(0) > 127,
    );
    const estimateDateRange = hasCorruptSeparator
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : dateRange;

    try {
      const params = new URLSearchParams({ from, to, dateRange: estimateDateRange });
      const estimateRes = await fetch(
        `/api/admin/reports/estimate?${params.toString()}`,
        { cache: "no-store" },
      );
      const estimate = (await estimateRes.json()) as ReportCostEstimate & {
        error?: string;
      };

      if (!estimateRes.ok) {
        throw new Error(estimate.error || "Failed to estimate report cost.");
      }

      setPendingReport({ from, to, dateRange: estimateDateRange, estimate });
    } catch (e) {
      console.error(e);
      setEstimateError(
        e instanceof Error ? e.message : "Failed to estimate report cost.",
      );
    } finally {
      setEstimateLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) return;

    const from = toISO(startDate);
    const to = toISO(endDate);
    const dateRange = `${formatDate(startDate)} – ${formatDate(endDate)}`;

    const hasCorruptGenerationSeparator = Array.from(dateRange).some(
      (char) => char.charCodeAt(0) > 127,
    );
    const generationDateRange = hasCorruptGenerationSeparator
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : dateRange;

    setLoading(true);
    setReportData(null);
    setChatMsgs([]);
    setReportRequest(null);
    setPendingReport(null);

    try {
      const dataRes = await fetch(
        `/api/admin/reports/data?from=${from}&to=${to}`,
        { cache: "no-store" },
      );
      const rawData = await dataRes.json();

      if (!dataRes.ok) {
        throw new Error(rawData.error || "Failed to load report data.");
      }

      const analyzeRes = await fetch("/api/admin/reports/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          dateRange: generationDateRange,
          reportType: "summary",
        }),
      });
      const aiInsights = await analyzeRes.json();

      if (!analyzeRes.ok) {
        throw new Error(aiInsights.error || "Failed to generate AI insights.");
      }

      const parsed = buildReportData(rawData, generationDateRange, aiInsights);

      setChatMsgs([
        {
          role: "assistant",
          text: `Hi! I've analyzed your data from ${generationDateRange}. What would you like to explore?`,
        },
      ]);
      setReportData(parsed);
      setReportRequest({ from, to, dateRange: generationDateRange });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Chat send
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
      setChatMsgs((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setChatMsgs((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const blob = new Blob([toCSV(reportData)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Report view ──────────────────────────────────────────────────────────────

  if (reportData) {
    const pieData = reportData.services.map((s) => ({
      name: s.name,
      value: s.revenue,
    }));

    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 960, mx: "auto" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <IconButton size="small" onClick={() => setReportData(null)}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Reports
          </Typography>
        </Box>

        <Typography sx={{ fontWeight: 700, fontSize: 16, mt: 2, mb: 0.3 }}>
          AI Business Data Report
        </Typography>
        <Typography sx={{ fontSize: 13, color: "#888", mb: 0.5 }}>
          {reportData.dateRange}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
          <Typography
            onClick={handleExportCSV}
            sx={{
              fontSize: 13,
              color: "#4285F4",
              cursor: "pointer",
              display: "inline-block",
            }}
          >
            Export CSV
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setAiUsageOpen(true)}
            sx={{
              borderRadius: 1,
              textTransform: "none",
              fontWeight: 800,
              fontSize: 12,
              borderColor: "#111",
              color: "#111",
              px: 1.5,
              py: 0.35,
              "&:hover": { borderColor: "#111", bgcolor: "#f8fafc" },
            }}
          >
            AI Usage
          </Button>
        </Box>

        <Dialog
          open={aiUsageOpen}
          onClose={() => setAiUsageOpen(false)}
          fullWidth
          maxWidth="lg"
        >
          <DialogTitle sx={{ fontWeight: 900 }}>AI Usage</DialogTitle>
          <DialogContent dividers>
            <AIUsageDashboard compact />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setAiUsageOpen(false)}
              sx={{ textTransform: "none", color: "#111", fontWeight: 800 }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Insight cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "repeat(3, 1fr)",
            },
            gap: 2,
            mb: 2.5,
          }}
        >
          {reportData.insights.map((ins, i) => (
            <InsightCard key={i} {...ins} />
          ))}
        </Box>

        {/* Stat cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
            gap: 2,
            mb: 2.5,
          }}
        >
          <StatCard
            icon="💵"
            value={`₱ ${reportData.totalRevenue.toLocaleString()}`}
            label="Total Revenue"
            trend={reportData.revenueTrend}
          />
          <StatCard
            icon="💵"
            value={`₱ ${reportData.avgRevenuePerDay.toLocaleString()}`}
            label="Average Revenue Per Day"
            trend={reportData.avgTrend}
          />
          <StatCard
            icon="📅"
            value={String(reportData.completedTransactions)}
            label="Completed Transactions"
            trend={reportData.apptTrend}
          />
          <StatCard
            icon="👥"
            value={`${reportData.completionRate}%`}
            label="Completion Rate"
            trend={reportData.rateTrend}
          />
        </Box>

        {/* Charts row */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
            mb: 2.5,
          }}
        >
          {/* Line chart */}
          <Box
            sx={{
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              p: 2.5,
              bgcolor: "#fff",
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>
              Revenue and Transaction Trend
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={reportData.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#111"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  stroke="#FBBC05"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <Box
              sx={{
                bgcolor: "#f9f9f9",
                border: "1px solid #e8e8e8",
                borderRadius: 1,
                p: 1.5,
                mt: 1.5,
              }}
            >
              <Typography sx={{ fontSize: 12, color: "#555" }}>
                <strong>AI Insight:</strong> {reportData.weeklyInsight}
              </Typography>
            </Box>
          </Box>

          {/* Pie chart + table */}
          <Box
            sx={{
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              p: 2.5,
              bgcolor: "#fff",
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>
              Service Revenue Distribution
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <PieChart width={200} height={160}>
                <Pie
                  data={pieData}
                  cx={100}
                  cy={80}
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </Box>

            {/* Service table */}
            <Box sx={{ mt: 1 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 1,
                  pb: 0.5,
                  borderBottom: "1px solid #eee",
                  mb: 0.5,
                }}
              >
                {["Service", "Count", "Revenue"].map((h) => (
                  <Typography
                    key={h}
                    sx={{ fontSize: 11, fontWeight: 600, color: "#888" }}
                  >
                    {h}
                  </Typography>
                ))}
              </Box>
              {reportData.services.map((s, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 1,
                    py: 0.5,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: s.color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography sx={{ fontSize: 12 }}>{s.name}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, textAlign: "right" }}>
                    {s.count}
                  </Typography>
                  <Typography sx={{ fontSize: 12, textAlign: "right" }}>
                    ₱{s.revenue.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                bgcolor: "#f9f9f9",
                border: "1px solid #e8e8e8",
                borderRadius: 1,
                p: 1.5,
                mt: 1.5,
              }}
            >
              <Typography sx={{ fontSize: 12, color: "#555" }}>
                <strong>AI Recommendation:</strong>{" "}
                {reportData.serviceRecommendation}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Ask AI chat */}
        <Box
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {/* Chat header */}
          <Box
            sx={{
              bgcolor: "#111",
              px: 2.5,
              py: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                bgcolor: "#FBBC05",
                borderRadius: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 20, color: "#111" }} />
            </Box>
            <Box>
              <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
                Ask AI Anything
              </Typography>
              <Typography sx={{ color: "#aaa", fontSize: 11 }}>
                Get instant insights from your business data
              </Typography>
            </Box>
          </Box>

          {/* Chat body */}
          <Box
            sx={{
              bgcolor: "#fff",
              px: 2.5,
              pt: 2,
              pb: 1,
              minHeight: 400,
              maxHeight: 340,
              overflowY: "auto",
            }}
          >
            {/* Quick questions */}
            <Typography
              sx={{ fontSize: 12, fontWeight: 600, color: "#555", mb: 1 }}
            >
              Quick questions:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mb: 2 }}>
              {QUICK_QUESTIONS.map((q) => (
                <Box
                  key={q}
                  onClick={() => handleChatSend(q)}
                  sx={{
                    fontSize: 12,
                    bgcolor: "#111",
                    color: "#FBBC05",
                    px: 1.5,
                    py: 0.6,
                    borderRadius: 5,
                    cursor: "pointer",
                    fontWeight: 500,
                    "&:hover": { bgcolor: "#333" },
                  }}
                >
                  {q}
                </Box>
              ))}
            </Box>

            {/* Messages */}
            {chatMsgs.map((m, i) => (
              <Box
                key={i}
                sx={{
                  mb: 1.5,
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <Box
                  sx={{
                    maxWidth: "80%",
                    px: 2,
                    py: 1.2,
                    borderRadius: 2,
                    fontSize: 13,
                    lineHeight: 1.6,
                    bgcolor: m.role === "user" ? "#111" : "#f3f3f3",
                    color: m.role === "user" ? "#fff" : "#222",
                    "& p": { margin: 0, mb: 0.8 },
                    "& ul, & ol": { mt: 0.5, mb: 0.8, pl: 2.5 },
                    "& li": { mb: 0.4 },
                    "& strong": { fontWeight: 700 },
                    "& h1, & h2, & h3": {
                      fontSize: 13,
                      fontWeight: 700,
                      mt: 1,
                      mb: 0.5,
                    },
                    "& p:last-child, & ul:last-child, & ol:last-child": {
                      mb: 0,
                    },
                  }}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  ) : (
                    m.text
                  )}
                </Box>
              </Box>
            ))}
            {chatLoading && (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <CircularProgress size={14} sx={{ color: "#FBBC05" }} />
                <Typography sx={{ fontSize: 12, color: "#888" }}>
                  Thinking…
                </Typography>
              </Box>
            )}
            <div ref={chatEndRef} />
          </Box>

          {/* Chat input */}
          <Box
            sx={{
              bgcolor: "#f4f4f4",
              px: 2,
              py: 1.2,
              display: "grid",
              gap: 0.8,
              borderTop: "1px solid #e0e0e0",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
              placeholder="Ask about revenue, trends, predictions…"
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 13,
                color: "#222",
              }}
            />

            {/* Deep Analysis button */}
            <Button
              size="small"
              onClick={() => handleChatSend(undefined, true)}
              disabled={chatLoading || !chatInput.trim()}
              startIcon={
                chatLoading ? (
                  <CircularProgress size={12} sx={{ color: "#111" }} />
                ) : (
                  <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                )
              }
              sx={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "none",
                color: "#111",
                bgcolor: "#FBBC05",
                px: 1.5,
                py: 0.6,
                borderRadius: 5,
                minWidth: "unset",
                whiteSpace: "nowrap",
                "&:hover": { bgcolor: "#f0b400" },
                "&:disabled": { bgcolor: "#e0e0e0", color: "#aaa" },
              }}
            >
              Deep Analysis
            </Button>

            {/* Regular send button */}
            <IconButton
              size="small"
              onClick={() => handleChatSend()}
              disabled={chatLoading || !chatInput.trim()}
            >
              <SendIcon
                fontSize="small"
                sx={{ color: chatInput.trim() ? "#111" : "#bbb" }}
              />
            </IconButton>
            </Box>

            {chatInput.trim() && (
              <Typography sx={{ fontSize: 11, color: "#666", lineHeight: 1.4 }}>
                {chatCostLoading && !chatCostEstimate
                  ? "Estimating prompt cost..."
                  : chatCostEstimate
                    ? `This prompt will cost about ${formatCostPHP(
                        chatCostEstimate.regular.estimatedTotalCostPHP,
                      )} with GPT-4o Mini. Deep Analysis may cost about ${formatCostPHP(
                        chatCostEstimate.deep.estimatedTotalCostPHP,
                      )}.`
                    : "Cost estimate unavailable."}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  // ── Date picker view ─────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Reports
      </Typography>

      {/* Date range display */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
          mb: 2.5,
        }}
      >
        {[
          { label: "Date From:", value: startDate },
          { label: "Date To:", value: endDate },
        ].map(({ label, value }) => (
          <Box
            key={label}
            sx={{
              bgcolor: "#f4f4f4",
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              px: 2,
              py: 1.2,
              minHeight: 42,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Typography
              component="span"
              sx={{ fontSize: 14, color: "#666", mr: 1, fontWeight: 600 }}
            >
              {label}
            </Typography>
            <Typography
              component="span"
              sx={{ fontSize: 14, color: value ? "#111" : "#999" }}
            >
              {formatDate(value)}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Year selector */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
        <Typography sx={{ fontSize: 14, color: "#555" }}>Year:</Typography>
        <Select
          value={selectedYear}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          size="small"
          sx={{ fontSize: 14, minWidth: 100 }}
        >
          {YEAR_OPTIONS.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Calendars */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
          mb: 3,
        }}
      >
        <Calendar
          monthDate={leftMonth}
          startDate={startDate}
          endDate={endDate}
          onNavigate={(dir) => handleNavigate("left", dir)}
          onSelectDay={handleSelectDay}
        />
        <Calendar
          monthDate={rightMonth}
          startDate={startDate}
          endDate={endDate}
          onNavigate={(dir) => handleNavigate("right", dir)}
          onSelectDay={handleSelectDay}
        />
      </Box>

      {/* Generate button */}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          onClick={handleEstimateReport}
          disabled={!startDate || !endDate || loading || estimateLoading}
          startIcon={
            loading || estimateLoading ? (
              <CircularProgress size={16} sx={{ color: "#fff" }} />
            ) : undefined
          }
          sx={{
            bgcolor: "#111",
            color: "#fff",
            px: 5,
            py: 1.4,
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 2,
            textTransform: "none",
            "&:hover": { bgcolor: "#333" },
            "&:disabled": { bgcolor: "#ccc", color: "#fff" },
          }}
        >
          {loading
            ? "Generating..."
            : estimateLoading
              ? "Estimating..."
              : "Estimate Cost"}
        </Button>
      </Box>

      {estimateError && (
        <Typography
          sx={{
            mt: 2,
            textAlign: "center",
            color: "#b91c1c",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {estimateError}
        </Typography>
      )}

      <Dialog
        open={Boolean(pendingReport)}
        onClose={() => setPendingReport(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Confirm AI Report</DialogTitle>
        <DialogContent>
          {pendingReport && (
            <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
              <Box>
                <Typography sx={{ fontSize: 13, color: "#777", mb: 0.5 }}>
                  Date Range
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800 }}>
                  {pendingReport.dateRange}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                  gap: 1.5,
                }}
              >
                {[
                  {
                    label: "Input Tokens",
                    value: formatTokenCount(
                      pendingReport.estimate.estimatedInputTokens,
                    ),
                  },
                  {
                    label: "Max Output Tokens",
                    value: formatTokenCount(
                      pendingReport.estimate.estimatedOutputTokens,
                    ),
                  },
                  {
                    label: "Estimated Total",
                    value: formatTokenCount(
                      pendingReport.estimate.estimatedTotalTokens,
                    ),
                  },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: "#fafafa",
                    }}
                  >
                    <Typography sx={{ fontSize: 12, color: "#777", mb: 0.5 }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 900 }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box
                sx={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 2,
                  p: 2,
                  display: "grid",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ fontSize: 13, color: "#555" }}>Model</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                    {pendingReport.estimate.model}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ fontSize: 13, color: "#555" }}>
                    Input Cost
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                    {formatCostUSD(pendingReport.estimate.estimatedInputCostUSD)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ fontSize: 13, color: "#555" }}>
                    Output Cost Cap
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                    {formatCostUSD(pendingReport.estimate.estimatedOutputCostUSD)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 900 }}>
                    Estimated Total
                  </Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 900 }}>
                    {formatCostUSD(pendingReport.estimate.estimatedTotalCostUSD)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 900 }}>
                    Estimated Total PHP
                  </Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 900 }}>
                    {formatCostPHP(pendingReport.estimate.estimatedTotalCostPHP)}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "#777", mt: 0.5 }}>
                  Uses PHP {pendingReport.estimate.exchangeRatePHP.toFixed(4)} per USD.
                  Actual output tokens and final cost are saved after generation.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPendingReport(null)}
            disabled={loading}
            sx={{ textTransform: "none", color: "#555", fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerateReport}
            disabled={loading}
            sx={{
              textTransform: "none",
              bgcolor: "#111",
              color: "#FBBC05",
              fontWeight: 900,
              "&:hover": { bgcolor: "#222" },
            }}
          >
            {loading ? "Generating..." : "Confirm and Generate"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
