"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";

import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
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
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardData = {
  pendingAppointments: number;
  todaySales: number;
  newAppointments: number;
  scheduledAppointments: number;
  cancellations: number;
  completedAppointments: number;
  revenueByService: { service: string; revenue: number; count: number }[];
  revenueByBarber: { name: string; revenue: number; services: number }[];
  paymentMethods: { method: string; percentage: number }[];
};

// ─── Mock fallback (replace with real API call) ───────────────────────────────

const MOCK: DashboardData = {
  pendingAppointments: 5,
  todaySales: 8000,
  newAppointments: 5,
  scheduledAppointments: 10,
  cancellations: 1,
  completedAppointments: 15,
  revenueByService: [
    { service: "Signature Haircut", revenue: 3900, count: 12 },
    { service: "Scalp Treatment", revenue: 3200, count: 8 },
    { service: "Shampoo", revenue: 2600, count: 6 },
    { service: "Charcoal Mask", revenue: 1400, count: 3 },
    { service: "Shave", revenue: 2900, count: 5 },
    { service: "Scalp Massage", revenue: 900, count: 2 },
  ],
  revenueByBarber: [
    { name: "Dwight Ramos", revenue: 1200, services: 4 },
    { name: "Rico Blanco", revenue: 1000, services: 3 },
    { name: "Chris Brown", revenue: 800, services: 2 },
    { name: "Chris Newsome", revenue: 500, services: 2 },
  ],
  paymentMethods: [
    { method: "Cash", percentage: 65 },
    { method: "GCash", percentage: 35 },
  ],
};

// ─── Barber color map ─────────────────────────────────────────────────────────

const BARBER_COLORS = ["#00bcd4", "#4caf50", "#ffc400", "#f44336"];
const PIE_COLORS = ["#2196f3", "#4caf50"];

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
        p: 2.5,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flex: 1,
        minWidth: 160,
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 13, color: "#888", mb: 0.5 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 26, fontWeight: 900 }}>{value}</Typography>
      </Box>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          bgcolor: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
    </Paper>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"Day" | "Week" | "Month">("Day");

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    if (!["OWNER", "RECEPTIONIST"].includes(session.user.role)) {
      router.push("/unauthorized");
      return;
    }

    const loadDashboard = async () => {
      try {
        setLoading(true);
 
        const [servicesRes, appointmentsRes] = await Promise.all([
            fetch("/api/admin/services", { cache: "no-store" }),
            fetch("/api/admin/appointments", { cache: "no-store" }),
        ]);
 
        if (servicesRes.status === 403 || appointmentsRes.status === 403) {
          router.push("/unauthorized");
          return;
        }
 
        const [servicesData, appointmentsData] = await Promise.all([
          servicesRes.json(),
          appointmentsRes.json(),
        ]);
 
        // Appointment counts by status
        type Appt = { 
            status: string, 
            payment?: { amount: string, method: string };
            }
        const appts: Appt[] = appointmentsData ?? [];

        const now = new Date();

        const filteredAppts = appts.filter((appt: any) => {
            const apptDate = new Date(appt.appointmentDate);

            if (period === "Day") {
                return (
                    apptDate.getDate() === now.getDate() &&
                    apptDate.getMonth() === now.getMonth() &&
                    apptDate.getFullYear() === now.getFullYear()
                );
            }

            if (period === "Week") {
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

                return apptDate >= startOfWeek && apptDate <= endOfWeek;
            }

            if (period === "Month") {
                return (
                    apptDate.getMonth() === now.getMonth() &&
                    apptDate.getFullYear() === now.getFullYear()
                );
            }

            return true;
        });

        const todaySales = filteredAppts
        .filter((a) => a.status === "COMPLETED")
        .reduce((total, appt) => {
            return total + Number(appt.payment?.amount ?? 0);
        }, 0);

        const newAppointments = filteredAppts.filter((a) => a.status === "PENDING").length;
        const cancellations = filteredAppts.filter((a) => a.status === "CANCELLED").length;
        const scheduledAppointments = filteredAppts.filter((a) => a.status === "SCHEDULED").length;
        const completedAppointments = filteredAppts.filter((a) => a.status === "COMPLETED").length;
        const pendingAppointments = newAppointments;

        const gcashCount = filteredAppts.filter((a) => a.payment?.method === "GCASH").length;
        const cashCount = filteredAppts.filter((a) => a.payment?.method === "CASH").length;
        const totalPayments = gcashCount + cashCount;

        const serviceMap = new Map();

        filteredAppts.forEach((appt: any) => {
            if (appt.status !== "COMPLETED") return;

            const serviceName = appt.service?.name ?? "Unknown";
            const amount = Number(appt.payment?.amount ?? 0);

            if (!serviceMap.has(serviceName)) {
                serviceMap.set(serviceName, {
                service: serviceName,
                revenue: 0,
                count: 0,
                });
            }

            const existing = serviceMap.get(serviceName);

            existing.revenue += amount;
            existing.count += 1;
            });

        const revenueByService = Array.from(serviceMap.values());

        const paymentMethods = totalPayments 
          ? [
                {
                    method: "GCASH",
                    percentage: Math.round((gcashCount / totalPayments) * 100),
                },
                {
                    method: "CASH",
                    percentage: Math.round((cashCount / totalPayments) * 100),
                }
            ]
          : [];

        const barberMap = new Map();

        filteredAppts.forEach((appt: any) => {
        if (appt.status !== "COMPLETED") return;

        const barberName = appt.barber?.name ?? "Unknown";
        const amount = Number(appt.payment?.amount ?? 0);

        if (!barberMap.has(barberName)) {
            barberMap.set(barberName, {
            name: barberName,
            revenue: 0,
            services: 0,
            });
        }

        const existing = barberMap.get(barberName);

        existing.revenue += amount;
        existing.services += 1;
        });

        const revenueByBarber = Array.from(barberMap.values()).sort(
        (a, b) => b.revenue - a.revenue
        );
        
        setData({
          pendingAppointments,
          todaySales,
          newAppointments,
          cancellations,
          scheduledAppointments,
          completedAppointments,
          revenueByBarber,
          paymentMethods,
          revenueByService,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
 
    loadDashboard();
  }, [session, status, period]);

  if (loading || status === "loading" || !data) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const maxBarberRevenue = Math.max(...data.revenueByBarber.map((b) => b.revenue));

  return (
    <Box sx={{ p: 4, bgcolor: "#fff", minHeight: "100vh" }}>
      {/* ── Header ── */}
      <Typography sx={{ fontSize: 34, fontWeight: 900, mb: 0.5 }}>
        Dashboard
      </Typography>

      {data.pendingAppointments > 0 && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <Typography sx={{ color: "#444", fontSize: 14 }}>
            You have {data.pendingAppointments} new appointments to confirm
          </Typography>
          <Button
            size="small"
            onClick={() => router.push("/admin/appointments")}
            sx={{
              bgcolor: "#111",
              color: "#fff",
              textTransform: "none",
              px: 2,
              py: 0.5,
              borderRadius: 1,
              fontSize: 13,
              "&:hover": { bgcolor: "#333" },
            }}
          >
            View
          </Button>
        </Box>
      )}

      {/* ── Period Toggle ── */}
      <Box sx={{ display: "flex", gap: 0, mb: 3, width: "fit-content" }}>
        {(["Day", "Week", "Month"] as const).map((p) => (
          <Button
            key={p}
            onClick={() => setPeriod(p)}
            sx={{
              textTransform: "none",
              px: 3,
              py: 0.8,
              fontWeight: 700,
              fontSize: 14,
              borderRadius: p === "Day" ? "8px 0 0 8px" : p === "Week" ? "0 8px 8px 0" : 0,
              bgcolor: period === p ? "#ffc400" : "#f3f3f3",
              color: "#111",
              border: "1px solid #e0e0e0",
              "&:hover": {
                bgcolor: period === p ? "#ffc400" : "#e8e8e8",
              },
            }}
          >
            {p}
          </Button>
        ))}
      </Box>

      {/* ── Metric Cards ── */}
      <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
        <MetricCard
          label="Today's Sales"
          value={`₱ ${data.todaySales.toLocaleString()}`}
          icon={<AttachMoneyIcon sx={{ color: "#4caf50", fontSize: 22 }} />}
          iconBg="#e8f5e9"
        />
        <MetricCard
          label="New Appointments"
          value={data.newAppointments}
          icon={<PersonAddIcon sx={{ color: "#2196f3", fontSize: 22 }} />}
          iconBg="#e3f2fd"
        />
        <MetricCard
          label="Scheduled Appointments"
          value={data.scheduledAppointments}
          icon={<CheckCircleOutlineIcon sx={{ color: "#2196f3", fontSize: 22 }} />}
          iconBg="#e3f2fd"
        />
        <MetricCard
          label="Completed Appointments"
          value={data.completedAppointments}
          icon={<CheckCircleOutlineIcon sx={{ color: "#2196f3", fontSize: 22 }} />}
          iconBg="#e3f2fd"
        />
        <MetricCard
          label="Cancellations"
          value={data.cancellations}
          icon={<CancelIcon sx={{ color: "#f44336", fontSize: 22 }} />}
          iconBg="#fdecea"
        />
      </Box>

      {/* ── Financial Analytics ── */}
      <Typography sx={{ fontSize: 22, fontWeight: 900, mb: 2 }}>
        Financial Analytics
      </Typography>

      {/* Revenue by Service */}
      <Paper
        elevation={0}
        sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 3, mb: 3 }}
      >
        <Typography sx={{ fontWeight: 800, mb: 2 }}>
          Revenue by Service Type
        </Typography>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data.revenueByService}
            margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="service"
              tick={{ fontSize: 11, fill: "#666" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              label={undefined}
              tickFormatter={(v) => v}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#666" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [`₱ ${value}`, "Revenue"]}
              labelFormatter={(label) => label}
              contentStyle={{ borderRadius: 8, fontSize: 13 }}
            />
            <Bar dataKey="revenue" fill="#2196f3" radius={[4, 4, 0, 0]} barSize={52}>
              {data.revenueByService.map((entry, index) => (
                <Cell key={index} fill="#2196f3" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Service labels with count */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-around",
            mt: -1,
          }}
        >
          {data.revenueByService.map((s) => (
            <Typography
              key={s.service}
              sx={{ fontSize: 10, color: "#999", textAlign: "center", width: 80 }}
            >
              {s.count} Services
            </Typography>
          ))}
        </Box>
      </Paper>

      {/* Bottom row: Revenue per Barber + Payment Methods */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
        {/* Revenue per Barber */}
        <Paper
          elevation={0}
          sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 3 }}
        >
          <Typography sx={{ fontWeight: 800, mb: 2 }}>
            Revenue Per Barber
          </Typography>

          {data.revenueByBarber.map((barber, index) => (
            <Box key={barber.name} sx={{ mb: 2.5 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                  {barber.name}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                  ₱ {barber.revenue.toLocaleString()}
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={(barber.revenue / maxBarberRevenue) * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "#f0f0f0",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: BARBER_COLORS[index % BARBER_COLORS.length],
                    borderRadius: 3,
                  },
                }}
              />

              <Typography sx={{ fontSize: 11, color: "#999", mt: 0.3 }}>
                {barber.services} services completed
              </Typography>
            </Box>
          ))}
        </Paper>

        {/* Payment Methods */}
        <Paper
          elevation={0}
          sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 3 }}
        >
          <Typography sx={{ fontWeight: 800, mb: 2 }}>
            Payment Methods
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <PieChart width={220} height={220}>
              <Pie
                data={data.paymentMethods}
                cx={105}
                cy={105}
                innerRadius={65}
                outerRadius={100}
                paddingAngle={3}
                dataKey="percentage"
                nameKey="method"
                startAngle={90}
                endAngle={-270}
              >
                {data.paymentMethods.map((entry, index) => (
                  <Cell
                    key={entry.method}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>

            <Box sx={{ width: "100%", mt: 1 }}>
              {data.paymentMethods.map((p, index) => (
                <Box
                  key={p.method}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 0.8,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: PIE_COLORS[index % PIE_COLORS.length],
                      }}
                    />
                    <Typography sx={{ fontSize: 13 }}>{p.method}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    {p.percentage}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}