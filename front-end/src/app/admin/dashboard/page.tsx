"use client";

import { createClient } from '@/lib/supabase/client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";


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
/*pendingAppointments: number; */
  todaySales: number;
/*newAppointments: number; */
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

// ─── Date filter helper ────────────────────────────────────────────────────────
// Generic period filter so the same logic applies to both sales (createdAt)
// and appointments (appointmentDate) without duplicating the day/week/month math.

function isInPeriod(date: Date, now: Date, period: "Day" | "Week" | "Month"): boolean {
  if (period === "Day") {
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }
  if (period === "Week") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return date >= startOfWeek && date <= endOfWeek;
  }
  if (period === "Month") {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  return true;
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
  const supabase = createClient();
  const [period, setPeriod] = useState<"Day" | "Week" | "Month">("Day");

  const { data, isLoading: loading } = useQuery<DashboardData>({
    queryKey: ["adminDashboard", period],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        throw new Error("Not authenticated");
      }

      const roleRes = await fetch("/api/user/role", { cache: "no-store" });
      const roleData = await roleRes.json();

      if (!["OWNER", "RECEPTIONIST"].includes(roleData.role)) {
        router.push("/unauthorized");
        throw new Error("Unauthorized");
      }

      const [appointmentsRes, salesRes] = await Promise.all([
        fetch("/api/admin/appointments", { cache: "no-store" }),
        fetch("/api/admin/sales", { cache: "no-store" }),
      ]);

      if (appointmentsRes.status === 403 || salesRes.status === 403) {
        router.push("/unauthorized");
        throw new Error("Unauthorized");
      }

      const [appointmentsData, salesData] = await Promise.all([
        appointmentsRes.json(),
        salesRes.json(),
      ]);

        // ── Appointments: filtered by appointmentDate ──
        // Used for status counts, peak hours, walk-in vs appointment counts.
        const filteredAppts = appts.filter((appt: any) =>
          isInPeriod(new Date(appt.appointmentDate), now, period)
        );
        
        // const newAppointments = appts.filter((a) => a.status === "PENDING").length;
        const scheduledAppointments = filteredAppts.filter((a) => a.status === "SCHEDULED").length;

      const appts: any[] = appointmentsData?.appointments ?? [];
      const sales: any[] = salesData?.sales ?? [];
      const now = new Date();

      // ── Appointments: filtered by appointmentDate ──
      // Used for status counts, peak hours, walk-in vs appointment counts.
      const filteredAppts = appts.filter((appt: any) =>
        isInPeriod(new Date(appt.appointmentDate), now, period)
      );

      // newAppointments intentionally counts ALL pending appts (not period-filtered),
      // matching original behavior — "pending to confirm" is an all-time queue, not a period stat.
      const newAppointments = appts.filter((a) => a.status === "PENDING").length;
      const scheduledAppointments = filteredAppts.filter((a) => a.status === "SCHEDULED").length;

      // ── Sales: filtered by createdAt ──
      // Used for revenue, revenue by service, revenue by barber, payment methods.
      const filteredSales = sales.filter((sale: any) => {
        if (sale.source === "WALKIN") {
          return isInPeriod(new Date(sale.createdAt), now, period);
        }

        // BOOKING: use the appointment date(s), not createdAt
        const apptDates: Date[] = (sale.appointments ?? []).map((a: any) => new Date(a.appointmentDate));
        if (apptDates.length === 0) {
          // safety fallback if a booking sale somehow has no linked appointments
          return isInPeriod(new Date(sale.createdAt), now, period);
        }
        return apptDates.some((d) => isInPeriod(d, now, period));
      });

      const paidSales = filteredSales.filter((s) => s.status === "PAID");

      const todaySales = paidSales.reduce(
        (total, sale) => total + Number(sale.totalAmount ?? 0),
        0
      );

      const completedAppointments = filteredSales.filter((a) => a.status === "PAID" && a.source === "BOOKING").length;
      const completedTransactions = filteredSales.filter((a) => a.status === "PAID").length;
      const cancellationsTotal = filteredSales.filter((a) => a.status === "CANCELLED").length;
      const cancellationsAppointments = filteredAppts.filter((a) => a.status === "CANCELLED").length;
      const noShows = filteredAppts.filter((a) => a.status === "NOSHOW").length;

      const walkInAppts = paidSales.filter((a: any) => a.source === "WALKIN");
      const bookedAppts = paidSales.filter((a: any) => a.source !== "WALKIN");
      const walkInVsAppointments = [
        {
          type: "Walk-in",
          customers: walkInAppts.length,
          revenue: walkInAppts.reduce((s: number, a: any) => s + Number(a.payment?.amount ?? 0), 0),
        },
        {
          type: "Appointments",
          customers: bookedAppts.length,
          revenue: bookedAppts.reduce((s: number, a: any) => s + Number(a.payment?.amount ?? 0), 0),
        },
      ];

      // Revenue by service: built from sale.items[], not appointments —
      // a single sale can contain multiple service line items.
      const serviceMap = new Map<string, { service: string; revenue: number; count: number }>();
      paidSales.forEach((sale: any) => {
        (sale.items ?? []).forEach((item: any) => {
          const serviceName = item.serviceName ?? "Unknown";
          const amount = Number(item.subtotal ?? item.price ?? 0);
          if (!serviceMap.has(serviceName)) {
            serviceMap.set(serviceName, { service: serviceName, revenue: 0, count: 0 });
          }
          const e = serviceMap.get(serviceName)!;
          e.revenue += amount;
          e.count += Number(item.quantity ?? 1);
        });
      });
      const revenueByService = Array.from(serviceMap.values());

      // Revenue by barber: from sale.barber, attributing the sale's totalAmount.
      const barberMap = new Map<string, { name: string; revenue: number; services: number }>();
      paidSales.forEach((sale: any) => {
        const barberName = sale.barber?.name ?? "Unknown";
        const amount = Number(sale.totalAmount ?? 0);
        const itemCount = (sale.items ?? []).reduce(
          (s: number, i: any) => s + Number(i.quantity ?? 1),
          0
        );
        if (!barberMap.has(barberName)) {
          barberMap.set(barberName, { name: barberName, revenue: 0, services: 0 });
        }
        const e = barberMap.get(barberName)!;
        e.revenue += amount;
        e.services += itemCount;
      });
      const revenueByBarber = Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue);

      // Payment methods: from sale.payment.method, counted per paid sale.
      const gcashCount = paidSales.filter((s) => s.payment?.method === "GCASH").length;
      const cashCount = paidSales.filter((s) => s.payment?.method === "CASH").length;
      const totalPayments = gcashCount + cashCount;
      const paymentMethods = totalPayments
        ? [
            { method: "GCASH", percentage: Math.round((gcashCount / totalPayments) * 100) },
            { method: "CASH", percentage: Math.round((cashCount / totalPayments) * 100) },
          ]
        : [];

      // Peak hours: based on appointment start time, all statuses (matches original).
      const hourMap = new Map<string, number>();
      filteredAppts.forEach((appt: any) => {
        if (appt.startMinutes == null) return;
        const h = Math.floor(appt.startMinutes / 60);
        const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
        hourMap.set(label, (hourMap.get(label) ?? 0) + 1);
      });

      // Walk-in sales — bucket by the hour they were created, since there's no separate appointment.
      const walkInSales = filteredSales.filter((s: any) => s.source === "WALKIN");
      walkInSales.forEach((sale: any) => {
        const created = new Date(sale.createdAt);
        const h = created.getHours();
        const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
        hourMap.set(label, (hourMap.get(label) ?? 0) + 1);
      });
      const peakHours = Array.from(hourMap.entries())
        .map(([hour, customers]) => ({ hour, customers }))
        .sort((a, b) => {
          const toMin = (s: string) => {
            const [n, p] = s.split(" ");
            return (p === "AM" ? parseInt(n) % 12 : (parseInt(n) % 12) + 12) * 60;
          };
          return toMin(a.hour) - toMin(b.hour);
        });

        // Revenue by barber: from sale.barber, attributing the sale's totalAmount.
        const barberMap = new Map<string, { name: string; revenue: number; services: number }>();
        paidSales.forEach((sale: any) => {
          const barberName = sale.barber?.name ?? "Unknown";
          const amount = Number(sale.totalAmount ?? 0);
          const itemCount = (sale.items ?? []).reduce(
            (s: number, i: any) => s + Number(i.quantity ?? 1),
            0
          );
          if (!barberMap.has(barberName)) {
            barberMap.set(barberName, { name: barberName, revenue: 0, services: 0 });
          }
          const e = barberMap.get(barberName)!;
          e.revenue += amount;
          e.services += itemCount;
        });
        const revenueByBarber = Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue);

        // Payment methods: from sale.payment.method, counted per paid sale.
        const gcashCount = paidSales.filter((s) => s.payment?.method === "GCASH").length;
        const cashCount = paidSales.filter((s) => s.payment?.method === "CASH").length;
        const totalPayments = gcashCount + cashCount;
        const paymentMethods = totalPayments
          ? [
              { method: "GCASH", percentage: Math.round((gcashCount / totalPayments) * 100) },
              { method: "CASH", percentage: Math.round((cashCount / totalPayments) * 100) },
            ]
          : [];

        // Peak hours: based on appointment start time, all statuses (matches original).
        const hourMap = new Map<string, number>();

        // Completed appointments
        filteredAppts.forEach((appt: any) => {
          if (appt.startMinutes == null) return;
          if (appt.status !== "COMPLETED") return;
          const h = Math.floor(appt.startMinutes / 60);
          const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
          hourMap.set(label, (hourMap.get(label) ?? 0) + 1);
        });

        // Paid walk-in sales
        filteredSales
          .filter((s: any) => s.source === "WALKIN" && s.status === "PAID")
          .forEach((sale: any) => {
            const date = new Date(sale.createdAt);
            const h = date.getHours();
            const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
            hourMap.set(label, (hourMap.get(label) ?? 0) + 1);
          });

        // Walk-in sales — bucket by the hour they were created, since there's no separate appointment.
        const walkInSales = filteredSales.filter((s: any) => s.source === "WALKIN");
        walkInSales.forEach((sale: any) => {
          const created = new Date(sale.createdAt);
          const h = created.getHours();
          const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
          hourMap.set(label, (hourMap.get(label) ?? 0) + 1);
        });
        const peakHours = Array.from(hourMap.entries())
          .map(([hour, customers]) => ({ hour, customers }))
          .sort((a, b) => {
            const toMin = (s: string) => {
              const [n, p] = s.split(" ");
              return (p === "AM" ? parseInt(n) % 12 : (parseInt(n) % 12) + 12) * 60;
            };
            return toMin(a.hour) - toMin(b.hour);
          });

        // Visit Frequency — computed from ALL paid sales (not period-filtered), since
        // "frequency" describes a customer's long-term pattern, not their activity in
        // the currently selected Day/Week/Month window.
        const customerVisits = new Map<string, Date[]>();
        sales
          .filter((s: any) => s.status === "PAID")
          .forEach((sale: any) => {
            const customerId = sale.customer?.id ?? "unknown";
            const date = new Date(sale.createdAt);
            if (!customerVisits.has(customerId)) customerVisits.set(customerId, []);
            customerVisits.get(customerId)!.push(date);
          });

        const frequencyBuckets = {
          Weekly: 0,
          "Bi-weekly": 0,
          Monthly: 0,
          Quarterly: 0,
        };

        customerVisits.forEach((dates) => {
          if (dates.length < 2) return; // need at least 2 visits to measure a gap; one-time customers excluded from this chart
          const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
          const gaps: number[] = [];
          for (let i = 1; i < sorted.length; i++) {
            const days = (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
            gaps.push(days);
          }
          const entry = customerRevenueMap.get(customerId)!;
          entry.visits += 1;
          entry.revenue += amount;
        });

        const totalReturningCustomers = Object.values(frequencyBuckets).reduce((a, b) => a + b, 0);

        const visitFrequency = Object.entries(frequencyBuckets).map(([frequency, customers]) => ({
          frequency,
          customers,
          percentage: totalReturningCustomers ? Math.round((customers / totalReturningCustomers) * 100) : 0,
        }));

        // Top Customers (By Revenue) — from ALL paid sales, not period-filtered,
        // so rankings reflect lifetime value rather than just the selected window.
        const customerRevenueMap = new Map<string, { name: string; visits: number; revenue: number }>();
        sales
          .filter((s: any) => s.status === "PAID")
          .forEach((sale: any) => {
            const customerId = sale.customer?.id ?? "unknown";
            const customerName = sale.customer?.name ?? "Unknown";
            const amount = Number(sale.totalAmount ?? 0);
            if (!customerRevenueMap.has(customerId)) {
              customerRevenueMap.set(customerId, { name: customerName, visits: 0, revenue: 0 });
            }
            const entry = customerRevenueMap.get(customerId)!;
            entry.visits += 1;
            entry.revenue += amount;
          });

        const topCustomers = Array.from(customerRevenueMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map((c, i) => ({ rank: i + 1, ...c }));

        setData({
          todaySales,
          cancellationsAppointments,
          cancellationsTotal,
          scheduledAppointments,
          completedAppointments,
          noShows,
          completedTransactions,
          revenueByBarber,
          paymentMethods,
          revenueByService,
          walkInVsAppointments,
          peakHours,
          visitFrequency,
          topCustomers,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    init()
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
        <MetricCard label="Completed Transactions                     (Walk-in & Appointment)" value={data.completedTransactions} icon={<CheckCircleOutlineIcon sx={{ color: "#4caf50", fontSize: 20 }} />} iconBg="#e8f5e9" />
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