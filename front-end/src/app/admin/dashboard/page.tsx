"use client";

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";

import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
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
  period?: string;
  todaySales: number;
  scheduledAppointments: number;
  cancellationsAppointments: number;
  cancellationsTotal: number;
  completedAppointments: number;
  completedTransactions: number;
  noShows: number;
  revenueByService: { service: string; revenue: number; count: number }[];
  revenueByBarber: { name: string; revenue: number; services: number }[];
  paymentMethods: { method: string; percentage: number }[];
  walkInVsAppointments: { type: string; customers: number; revenue: number }[];
  peakHours: { hour: string; customers: number }[];
  visitFrequency: { frequency: string; customers: number; percentage: number }[];
  topCustomers: { rank: number; name: string; visits: number; revenue: number }[];
};

// ─── Colors ───────────────────────────────────────────────────────────────────

const BARBER_COLORS = ["#00bcd4", "#4caf50", "#ffc400", "#f44336"];
const PIE_COLORS = ["#2196f3", "#4caf50"];
const WALKIN_COLORS = ["#ffc400", "#2196f3"];
const FREQ_COLORS = ["#2196f3", "#ff9800", "#f44336", "#4caf50"];

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
  const supabase = createClient()

  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<"Day" | "Week" | "Month">("Day");

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const res = await fetch('/api/user/role')
        const roleData = await res.json()

        if (!['OWNER', 'RECEPTIONIST'].includes(roleData.role)) {
          router.push('/unauthorized')
          return
        }

        const metricsRes = await fetch(`/api/admin/dashboard-metrics?period=${period}`, {
          cache: "no-store",
        });

        if (metricsRes.status === 401 || metricsRes.status === 403) {
          router.push("/unauthorized");
          return;
        }

        const metricsData: DashboardData = await metricsRes.json();
        setData(metricsData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [period]);

  if (loading || !data) {
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
      
      <Box sx={{ display: "flex", mb: 3, width: "fit-content" }}>
        {(["Day", "Week", "Month"] as const).map((p) => (
          <Button
            key={p}
            onClick={() => setPeriod(p)}
            sx={{
              textTransform: "none", px: { xs: 2, md: 3 }, py: 0.8, fontWeight: 700, fontSize: 14,
              borderRadius: p === "Day" ? "8px 0 0 8px" : p === "Month" ? "0 8px 8px 0" : 0,
              bgcolor: period === p ? "#ffc400" : "#f3f3f3",
              color: "#111", border: "1px solid #e0e0e0",
              "&:hover": { bgcolor: period === p ? "#ffc400" : "#e8e8e8" },
            }}
          >
            {p}
          </Button>
        ))}
      </Box>

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

      <SectionTitle>Financial Analytics</SectionTitle>

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