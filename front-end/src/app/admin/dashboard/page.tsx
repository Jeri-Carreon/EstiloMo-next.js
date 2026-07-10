"use client";

import { createClient } from '@/lib/supabase/client';
import {
  getDefaultDashboardCustomRange,
  validateDashboardCustomRange,
  type DashboardGrouping,
  type DashboardPeriod,
} from "@/lib/dashboardDateRange";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";


import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";

import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CancelIcon from "@mui/icons-material/Cancel";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardData = {
  period?: DashboardPeriod;
  barberId?: string | null;
  dateRange?: {
    from: string;
    to: string;
    fromTime?: string;
    toTime?: string;
    grouping: DashboardGrouping;
    dayCount: number;
  };
  todaySales: number;
  scheduledAppointments: number;
  pendingAppointments?: number;
  cancellationsAppointments: number;
  rejectedAppointments?: number;
  cancellationsTotal: number;
  completedAppointments: number;
  completedTransactions: number;
  completionRate?: number;
  noShows: number;
  newCustomers?: number;
  reviewsTotal?: number;
  averageReviewRating?: number;
  revenueByService: { service: string; revenue: number; count: number }[];
  revenueByBarber: { name: string; revenue: number; services: number }[];
  revenueTrendData?: { label: string; revenue: number; transactions: number }[];
  paymentMethods: { method: string; percentage: number }[];
  walkInVsAppointments: { type: string; customers: number; revenue: number }[];
  peakHours: { hour: string; customers: number }[];
  visitFrequency: { frequency: string; customers: number; percentage: number }[];
  topCustomers: { rank: number; name: string; visits: number; revenue: number }[];
  trends?: {
    revenue: number;
    appointments: number;
    transactions: number;
    completionRate: number;
  };
};

type BarberOption = {
  id: string;
  name: string;
  isActive?: boolean;
};

// ─── Colors ───────────────────────────────────────────────────────────────────

const BARBER_COLORS = ["#00bcd4", "#4caf50", "#ffc400", "#f44336"];
const PIE_COLORS = ["#2196f3", "#4caf50"];
const WALKIN_COLORS = ["#ffc400", "#2196f3"];
const FREQ_COLORS = ["#2196f3", "#ff9800", "#f44336", "#4caf50"];

const PERIOD_OPTIONS: { label: string; value: DashboardPeriod }[] = [
  { label: "Day", value: "Day" },
  { label: "Week", value: "Week" },
  { label: "Month", value: "Month" },
  { label: "Custom Range", value: "custom" },
];

type DashboardRequest = {
  period: DashboardPeriod;
  from?: string;
  to?: string;
  fromTime?: string;
  toTime?: string;
  barberId?: string;
};

function buildDashboardMetricsUrl(request: DashboardRequest) {
  const params = new URLSearchParams({ period: request.period });

  if (request.period === "custom" && request.from && request.to) {
    params.set("from", request.from);
    params.set("to", request.to);
    if (request.fromTime) params.set("fromTime", request.fromTime);
    if (request.toTime) params.set("toTime", request.toTime);
  }

  if (request.barberId) {
    params.set("barberId", request.barberId);
  }

  return `/api/admin/dashboard-metrics?${params.toString()}`;
}

function formatTrend(value: number) {
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon,
  iconBg,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e5e7eb",
        borderRadius: 2,
        p: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flex: "1 1 140px",
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 12, color: "#888", mb: 0.5 }}>{label}</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 900 }}>{value}</Typography>
      </Box>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          bgcolor: iconBg,
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

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 900, mb: 2 }}>
      {children}
    </Typography>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();

  // Session
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const defaultCustomRange = useMemo(() => getDefaultDashboardCustomRange(), []);

  const [data, setData] = useState<DashboardData | null>(null);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [period, setPeriod] = useState<DashboardPeriod>("Day");
  const [customFrom, setCustomFrom] = useState(defaultCustomRange.from);
  const [customTo, setCustomTo] = useState(defaultCustomRange.to);
  const [customFromTime, setCustomFromTime] = useState(defaultCustomRange.fromTime);
  const [customToTime, setCustomToTime] = useState(defaultCustomRange.toTime);
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [appliedRequest, setAppliedRequest] = useState<DashboardRequest>({
    period: "Day",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const customValidationMessage =
    period === "custom"
      ? validateDashboardCustomRange(customFrom, customTo, customFromTime, customToTime)
      : "";

  useEffect(() => {
    let ignore = false;

    const init = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const res = await fetch('/api/user/role')
        const roleData = await res.json()

        if (!roleData.accessibleTabs?.includes("dashboard")) {
          router.push('/unauthorized')
          return
        }

        const [metricsRes, barbersRes] = await Promise.all([
          fetch(buildDashboardMetricsUrl(appliedRequest), {
            cache: "no-store",
          }),
          fetch("/api/admin/barbers", {
            cache: "no-store",
          }),
        ]);

        if (metricsRes.status === 401 || metricsRes.status === 403) {
          router.push("/unauthorized");
          return;
        }

        if (barbersRes.ok) {
          const barbersPayload = await barbersRes.json();
          if (!ignore) {
            setBarbers(
              Array.isArray(barbersPayload.barbers)
                ? barbersPayload.barbers.map(
                    (barber: { id: string; name: string; isActive?: boolean }) => ({
                      id: barber.id,
                      name: barber.name,
                      isActive: barber.isActive,
                    }),
                  )
                : [],
            );
          }
        }

        const metricsPayload = await metricsRes.json();
        if (!metricsRes.ok) {
          throw new Error(metricsPayload.error || "Failed to load dashboard metrics.");
        }

        if (!ignore) {
          setData(metricsPayload as DashboardData);
        }
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load dashboard metrics.",
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      ignore = true;
    };
  }, [appliedRequest, router, supabase]);

  const handlePeriodSelect = (nextPeriod: DashboardPeriod) => {
    setPeriod(nextPeriod);
    setErrorMessage("");

    if (nextPeriod !== "custom") {
      setAppliedRequest({
        period: nextPeriod,
        barberId: appliedRequest.barberId,
      });
    }
  };

  const handleApplyCustomRange = () => {
    if (customValidationMessage || loading) return;
    setAppliedRequest({
      period: "custom",
      from: customFrom,
      to: customTo,
      fromTime: customFromTime,
      toTime: customToTime,
      barberId: appliedRequest.barberId,
    });
  };

  const handleResetCustomRange = () => {
    const resetRange = getDefaultDashboardCustomRange();
    setCustomFrom(resetRange.from);
    setCustomTo(resetRange.to);
    setCustomFromTime(resetRange.fromTime);
    setCustomToTime(resetRange.toTime);
    setPeriod("custom");
    setAppliedRequest({
      period: "custom",
      from: resetRange.from,
      to: resetRange.to,
      fromTime: resetRange.fromTime,
      toTime: resetRange.toTime,
      barberId: appliedRequest.barberId,
    });
  };

  const handleApplyBarberFilter = () => {
    if (loading) return;

    setAppliedRequest((current) => ({
      ...current,
      barberId: selectedBarberId || undefined,
    }));
  };

  const handleViewAllBarbers = () => {
    setSelectedBarberId("");
    setAppliedRequest((current) => ({
      ...current,
      barberId: undefined,
    }));
  };

  if (!data) {
    if (loading) {
      return (
        <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <CircularProgress />
        </Box>
      );
    }

    if (errorMessage) {
      return (
        <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#fff", minHeight: "100vh" }}>
          <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 900, mb: 2 }}>
            Dashboard
          </Typography>
          <Typography sx={{ color: "#b91c1c", fontWeight: 700 }}>
            {errorMessage}
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const maxBarberRevenue = Math.max(...data.revenueByBarber.map((b) => b.revenue), 1);
  const maxPeakCustomers = data.peakHours.length ? Math.max(...data.peakHours.map((h) => h.customers)) : 0;
  const minPeakCustomers = data.peakHours.length ? Math.min(...data.peakHours.map((h) => h.customers)) : 0;
  const busiestHour = data.peakHours.find((h) => h.customers === maxPeakCustomers);
  const slowestHour = data.peakHours.find((h) => h.customers === minPeakCustomers);

  const twoColGrid = { display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#fff", minHeight: "100vh", maxWidth: "100%", overflowX: "hidden" }}>

      <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 900, mb: 0.5 }}>
        Dashboard
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "minmax(220px, 320px) auto auto" },
          gap: 1.5,
          alignItems: "center",
          mb: 2,
          maxWidth: 720,
        }}
      >
        <Select
          size="small"
          displayEmpty
          value={selectedBarberId}
          onChange={(event) => setSelectedBarberId(event.target.value)}
          sx={{ bgcolor: "#fff", minHeight: 40 }}
        >
          <MenuItem value="">Select barber</MenuItem>
          {barbers.map((barber) => (
            <MenuItem key={barber.id} value={barber.id}>
              {barber.name}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          onClick={handleApplyBarberFilter}
          disabled={loading || !selectedBarberId}
          sx={{
            bgcolor: "#111",
            color: "#ffc400",
            textTransform: "none",
            fontWeight: 800,
            minHeight: 40,
            "&:hover": { bgcolor: "#222" },
            "&:disabled": { bgcolor: "#ddd", color: "#888" },
          }}
        >
          View Barber Data
        </Button>
        <Button
          variant="outlined"
          onClick={handleViewAllBarbers}
          disabled={loading || !appliedRequest.barberId}
          sx={{
            color: "#111",
            borderColor: "#d1d5db",
            textTransform: "none",
            fontWeight: 800,
            minHeight: 40,
            "&:hover": { borderColor: "#111", bgcolor: "#f8fafc" },
          }}
        >
          View All Barbers
        </Button>
      </Box>

      {appliedRequest.barberId && (
        <Typography sx={{ fontSize: 13, color: "#666", mb: 2 }}>
          Showing dashboard data for{" "}
          {barbers.find((barber) => barber.id === appliedRequest.barberId)?.name ??
            "selected barber"}
          .
        </Typography>
      )}
      
      <Box sx={{ display: "flex", mb: period === "custom" ? 1.5 : 3, width: "fit-content", flexWrap: "wrap" }}>
        {PERIOD_OPTIONS.map((item, index) => (
          <Button
            key={item.value}
            onClick={() => handlePeriodSelect(item.value)}
            sx={{
              textTransform: "none", px: { xs: 2, md: 3 }, py: 0.8, fontWeight: 700, fontSize: 14,
              borderRadius: index === 0 ? "8px 0 0 8px" : index === PERIOD_OPTIONS.length - 1 ? "0 8px 8px 0" : 0,
              bgcolor: period === item.value ? "#ffc400" : "#f3f3f3",
              color: "#111", border: "1px solid #e0e0e0",
              "&:hover": { bgcolor: period === item.value ? "#ffc400" : "#e8e8e8" },
            }}
          >
            {item.label}
          </Button>
        ))}
      </Box>

      {period === "custom" && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1.5,
              alignItems: "start",
              mb: 2,
              maxWidth: 860,
            }}
          >
          <TextField
            label="Date From"
            type="date"
            size="small"
            value={customFrom}
            onChange={(event) => setCustomFrom(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Date To"
            type="date"
            size="small"
            value={customTo}
            onChange={(event) => setCustomTo(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Time From"
            type="time"
            size="small"
            value={customFromTime}
            onChange={(event) => setCustomFromTime(event.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 60 } }}
          />
          <TextField
            label="Time To"
            type="time"
            size="small"
            value={customToTime}
            onChange={(event) => setCustomToTime(event.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 60 } }}
          />
          {customValidationMessage && (
            <Typography
              sx={{
                gridColumn: "1 / -1",
                color: "#b91c1c",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {customValidationMessage}
            </Typography>
          )}
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={handleApplyCustomRange}
              disabled={Boolean(customValidationMessage) || loading}
              sx={{
                bgcolor: "#111",
                color: "#ffc400",
                textTransform: "none",
                fontWeight: 800,
                minHeight: 40,
                "&:hover": { bgcolor: "#222" },
                "&:disabled": { bgcolor: "#ddd", color: "#888" },
              }}
            >
              Apply
            </Button>
            <Button
              variant="outlined"
              onClick={handleResetCustomRange}
              disabled={loading}
              sx={{
                color: "#111",
                borderColor: "#d1d5db",
                textTransform: "none",
                fontWeight: 800,
                minHeight: 40,
                "&:hover": { borderColor: "#111", bgcolor: "#f8fafc" },
              }}
            >
              Reset
            </Button>
          </Box>
        </>
      )}

      {errorMessage && (
        <Typography sx={{ color: "#b91c1c", fontSize: 13, fontWeight: 700, mb: 2 }}>
          {errorMessage}
        </Typography>
      )}

      {loading && data && <LinearProgress sx={{ mb: 2 }} />}

      <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
        <MetricCard label="Scheduled Appointments" value={data.scheduledAppointments} icon={<CalendarTodayIcon sx={{ color: "#2196f3", fontSize: 20 }} />} iconBg="#e3f2fd" />
        <MetricCard label="Completed Appointments" value={data.completedAppointments} icon={<CheckCircleOutlineIcon sx={{ color: "#4caf50", fontSize: 20 }} />} iconBg="#e8f5e9" />
        <MetricCard label="Cancelled Appointments" value={data.cancellationsAppointments} icon={<CancelIcon sx={{ color: "#f44336", fontSize: 20 }} />} iconBg="#fdecea" />
        <MetricCard label="No-Show Appointments" value={data.noShows} icon={<CancelIcon sx={{ color: "#f44336", fontSize: 20 }} />} iconBg="#fdecea" />

      </Box>
      <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
        <MetricCard label="Sales" value={`₱ ${data.todaySales.toLocaleString()}`} icon={<AttachMoneyIcon sx={{ color: "#4caf50", fontSize: 20 }} />} iconBg="#e8f5e9" />
        <MetricCard label="Completed Transactions (Walk-in & Appointment)" value={data.completedTransactions} icon={<CheckCircleOutlineIcon sx={{ color: "#4caf50", fontSize: 20 }} />} iconBg="#e8f5e9" />
        <MetricCard label="Cancelled Transactions" value={data.cancellationsTotal} icon={<CancelIcon sx={{ color: "#f44336", fontSize: 20 }} />} iconBg="#fdecea" />
      </Box>

      {data.trends && (
        <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2, mb: 4 }}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>Previous Period Comparison</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {[
              { label: "Revenue", value: data.trends.revenue },
              { label: "Appointments", value: data.trends.appointments },
              { label: "Transactions", value: data.trends.transactions },
              { label: "Completion Rate", value: data.trends.completionRate },
            ].map((item) => (
              <Typography
                key={item.label}
                sx={{
                  fontSize: 13,
                  color: item.value >= 0 ? "#15803d" : "#b91c1c",
                  fontWeight: 800,
                }}
              >
                {item.label}: {formatTrend(item.value)}
              </Typography>
            ))}
          </Box>
        </Paper>
      )}

      <SectionTitle>Financial Analytics</SectionTitle>

      {data.revenueTrendData && (
        <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: { xs: 2, md: 3 }, mb: 3 }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Revenue Trend</Typography>
          <ResponsiveContainer width="99%" height={260}>
            <BarChart data={data.revenueTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value, name) => [name === "revenue" ? `PHP ${value}` : value, name === "revenue" ? "Revenue" : "Transactions"]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="revenue" fill="#2196f3" radius={[4, 4, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
          {data.dateRange && (
            <Typography sx={{ fontSize: 11, color: "#888", mt: 1 }}>
              Grouped by {data.dateRange.grouping}.
            </Typography>
          )}
        </Paper>
      )}

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Typography sx={{ fontWeight: 800, mb: 2 }}>Revenue by Service Type</Typography>
        <ResponsiveContainer width="99%" height={260}>
          <BarChart data={data.revenueByService} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="service" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => [`₱ ${value}`, "Revenue"]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
            <Bar dataKey="revenue" fill="#2196f3" radius={[4, 4, 0, 0]} barSize={44}>
              {data.revenueByService.map((_, i) => <Cell key={i} fill="#2196f3" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Box sx={{ display: "flex", justifyContent: "space-around", mt: 1 }}>
          {data.revenueByService.map((s) => (
            <Typography key={s.service} sx={{ fontSize: 10, color: "#999", textAlign: "center", width: 70 }}>
              {s.count} Services
            </Typography>
          ))}
        </Box>
      </Paper>

      <Box sx={{ ...twoColGrid, mb: 5 }}>
        <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: { xs: 2, md: 3 } }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Revenue Per Barber</Typography>
          {data.revenueByBarber.map((barber, index) => (
            <Box key={barber.name} sx={{ mb: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{barber.name}</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>₱ {barber.revenue.toLocaleString()}</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(barber.revenue / maxBarberRevenue) * 100}
                sx={{ height: 6, borderRadius: 3, bgcolor: "#f0f0f0", "& .MuiLinearProgress-bar": { bgcolor: BARBER_COLORS[index % BARBER_COLORS.length], borderRadius: 3 } }}
              />
              <Typography sx={{ fontSize: 11, color: "#999", mt: 0.3 }}>{barber.services} services completed</Typography>
            </Box>
          ))}
        </Paper>

        <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: { xs: 2, md: 3 } }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Payment Methods</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ResponsiveContainer width="99%" height={200}>
              <PieChart>
                <Pie data={data.paymentMethods} cx="50%" cy="50%" innerRadius={58} outerRadius={90} paddingAngle={3} dataKey="percentage" nameKey="method" startAngle={90} endAngle={-270}>
                  {data.paymentMethods.map((entry, i) => <Cell key={entry.method} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ width: "100%", mt: 1 }}>
              {data.paymentMethods.map((p, i) => (
                <Box key={p.method} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.8 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <Typography sx={{ fontSize: 13 }}>{p.method}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{p.percentage}%</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      </Box>

      <SectionTitle>Operational Analytics</SectionTitle>

      <Box sx={{ ...twoColGrid, mb: 5 }}>
        <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: { xs: 2, md: 3 } }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Walk-in vs Appointments</Typography>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <ResponsiveContainer width="99%" height={200}>
              <PieChart>
                <Pie data={data.walkInVsAppointments} cx="50%" cy="50%" innerRadius={58} outerRadius={90} paddingAngle={3} dataKey="customers" nameKey="type" startAngle={90} endAngle={-270}>
                  {data.walkInVsAppointments.map((entry, i) => <Cell key={entry.type} fill={WALKIN_COLORS[i % WALKIN_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ mt: 1 }}>
            {data.walkInVsAppointments.map((w, i) => (
              <Box key={w.type} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.8 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: WALKIN_COLORS[i % WALKIN_COLORS.length] }} />
                  <Typography sx={{ fontSize: 13 }}>{w.type}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 3 } }}>
                  <Typography sx={{ fontSize: 13, color: "#888" }}>{w.customers} customers</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>₱ {w.revenue.toLocaleString()}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: { xs: 2, md: 3 } }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Peak Hours</Typography>
          <ResponsiveContainer width="99%" height={200}>
            <BarChart data={data.peakHours} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#666" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#666" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [value, "Customers"]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="customers" radius={[4, 4, 0, 0]} barSize={22}>
                {data.peakHours.map((entry, i) => (
                  <Cell key={i} fill={entry.customers === maxPeakCustomers ? "#f44336" : "#2196f3"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: 11, color: "#888" }}>Busiest Hour</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{busiestHour?.hour} ({busiestHour?.customers} customers)</Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography sx={{ fontSize: 11, color: "#888" }}>Slowest Hour</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{slowestHour?.hour} ({slowestHour?.customers} customers)</Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      <SectionTitle>Customer Analytics</SectionTitle>

      <Box sx={twoColGrid}>
        <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: { xs: 2, md: 3 } }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Visit Frequency Distribution</Typography>
          <ResponsiveContainer width="99%" height={200}>
            <BarChart data={data.visitFrequency} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="frequency" tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value, _name, props) => [`${value} customers`, props.payload.frequency]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="customers" radius={[4, 4, 0, 0]} barSize={44}>
                {data.visitFrequency.map((_, i) => <Cell key={i} fill={FREQ_COLORS[i % FREQ_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Box sx={{ mt: 1.5 }}>
            {data.visitFrequency.map((f, i) => (
              <Box key={f.frequency} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: FREQ_COLORS[i % FREQ_COLORS.length] }} />
                  <Typography sx={{ fontSize: 13 }}>{f.frequency}</Typography>
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{f.percentage}%</Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: { xs: 2, md: 3 } }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Top Customers (By Revenue)</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {data.topCustomers.map((customer) => (
              <Box key={customer.rank} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, borderBottom: "1px solid #f5f5f5" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: "#ffc400", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#111", flexShrink: 0 }}>
                    {customer.rank}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: { xs: 13, md: 14 } }}>{customer.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: "#888" }}>{customer.visits} visits</Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: 13, md: 14 } }}>₱ {customer.revenue.toLocaleString()}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
