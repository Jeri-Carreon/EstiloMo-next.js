"use client";

import { useEffect, useMemo, useState } from "react";

import AssessmentIcon from "@mui/icons-material/Assessment";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DescriptionIcon from "@mui/icons-material/Description";
import TokenIcon from "@mui/icons-material/Token";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

type UsageFilter = "today" | "week" | "month" | "custom";

type UsageReport = {
  id: string;
  dateFrom: string;
  dateTo: string;
  reportType: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUSD: number;
  totalCostPHP: number;
  generatedAt: string;
};

type UsageData = {
  totalReportsGenerated: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  averageTokensPerReport: number;
  totalCostUSD: number;
  totalCostPHP: number;
  averageCostPerReportUSD: number;
  averageCostPerReportPHP: number;
  mostExpensiveReport: UsageReport | null;
  cheapestReport: UsageReport | null;
};

const FILTERS: { label: string; value: UsageFilter }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Custom Date Range", value: "custom" },
];

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUSD(value: number) {
  return `$${value.toFixed(4)}`;
}

function formatPHP(value: number) {
  return `PHP ${value.toFixed(4)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e5e7eb",
        borderRadius: 2,
        p: 2,
        minHeight: 112,
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 12, color: "#777", fontWeight: 700, mb: 1 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 900, wordBreak: "break-word" }}>
          {value}
        </Typography>
      </Box>
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          bgcolor: "#111",
          color: "#FBBC05",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
    </Paper>
  );
}

function ReportCostPanel({
  title,
  report,
}: {
  title: string;
  report: UsageReport | null;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e5e7eb",
        borderRadius: 2,
        p: 2.25,
      }}
    >
      <Typography sx={{ fontSize: 14, fontWeight: 900, mb: 1.5 }}>{title}</Typography>
      {!report ? (
        <Typography sx={{ fontSize: 13, color: "#777" }}>No reports in this range.</Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 1 }}>
          <Typography sx={{ fontSize: 13, color: "#555" }}>
            {formatDate(report.dateFrom)} - {formatDate(report.dateTo)}
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 900 }}>
            {formatUSD(report.totalCostUSD)} / {formatPHP(report.totalCostPHP)}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 1,
              fontSize: 13,
              color: "#555",
            }}
          >
            <span>Model: {report.model}</span>
            <span>Tokens: {formatNumber(report.totalTokens)}</span>
            <span>Generated: {formatDate(report.generatedAt)}</span>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

export default function AIUsagePage() {
  const today = useMemo(() => new Date(), []);
  const [filter, setFilter] = useState<UsageFilter>("month");
  const [from, setFrom] = useState(toISODate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(toISODate(today));
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (filter === "custom" && (!from || !to)) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ filter });
    if (filter === "custom") {
      params.set("from", from);
      params.set("to", to);
    }

    const loadUsage = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/reports/usage?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load AI usage.");
        }
        setData(json);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to load AI usage.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadUsage();

    return () => controller.abort();
  }, [filter, from, to]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          AI Usage
        </Typography>
        <Typography sx={{ fontSize: 13, color: "#777" }}>
          Report generation cost and token usage
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            size="small"
            variant={filter === item.value ? "contained" : "outlined"}
            onClick={() => setFilter(item.value)}
            sx={{
              borderRadius: 1,
              textTransform: "none",
              fontWeight: 800,
              bgcolor: filter === item.value ? "#111" : "#fff",
              borderColor: "#d1d5db",
              color: filter === item.value ? "#FBBC05" : "#111",
              "&:hover": {
                bgcolor: filter === item.value ? "#222" : "#f8fafc",
                borderColor: "#111",
              },
            }}
          >
            {item.label}
          </Button>
        ))}
      </Box>

      {filter === "custom" && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
            mb: 3,
            maxWidth: 520,
          }}
        >
          <TextField
            label="Date From"
            type="date"
            size="small"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Date To"
            type="date"
            size="small"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 8 }}>
          <CircularProgress size={18} sx={{ color: "#111" }} />
          <Typography sx={{ fontSize: 13, color: "#777" }}>Loading usage...</Typography>
        </Box>
      ) : error ? (
        <Paper
          elevation={0}
          sx={{ border: "1px solid #fecaca", bgcolor: "#fff1f2", borderRadius: 2, p: 2 }}
        >
          <Typography sx={{ fontSize: 13, color: "#991b1b", fontWeight: 700 }}>
            {error}
          </Typography>
        </Paper>
      ) : data ? (
        <Box sx={{ display: "grid", gap: 3 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <MetricCard
              label="Total Reports Generated"
              value={formatNumber(data.totalReportsGenerated)}
              icon={<DescriptionIcon fontSize="small" />}
            />
            <MetricCard
              label="Total Input Tokens"
              value={formatNumber(data.totalInputTokens)}
              icon={<TokenIcon fontSize="small" />}
            />
            <MetricCard
              label="Total Output Tokens"
              value={formatNumber(data.totalOutputTokens)}
              icon={<TokenIcon fontSize="small" />}
            />
            <MetricCard
              label="Total Tokens"
              value={formatNumber(data.totalTokens)}
              icon={<AssessmentIcon fontSize="small" />}
            />
            <Box sx={{ gridColumn: { lg: "span 2" } }}>
  <MetricCard
    label="Total Cost (PHP)"
    value={formatPHP(data.totalCostPHP)}
    icon={<AttachMoneyIcon fontSize="small" />}
  />
</Box>

<Box sx={{ gridColumn: { lg: "span 2" } }}>
  <MetricCard
    label="Average Cost Per Report"
    value={`${formatUSD(data.averageCostPerReportUSD)} / ${formatPHP(data.averageCostPerReportPHP)}`}
    icon={<AttachMoneyIcon fontSize="small" />}
  />
</Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <ReportCostPanel title="Most Expensive Report" report={data.mostExpensiveReport} />
            <ReportCostPanel title="Cheapest Report" report={data.cheapestReport} />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
