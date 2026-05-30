'use client';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InfoIcon from '@mui/icons-material/Info';
import Pagination from '@mui/material/Pagination';

interface Appointment {
  id: string;
  appointmentCode: string;
  customerCode: string;
  customerName: string;
  schedule: string;
  serviceName: string;
  barberName: string;
  totalAmount: number | string | null;
  status: string;
}

export default function AppointmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingPage, setPendingPage] = useState(1);
  const [processedPage, setProcessedPage] = useState(1);

  const itemsPerPage = 4;
  const loadAppointments = async () => {
    try {
      const res = await fetch("/api/admin/appointments", { cache: "no-store" });

      if (res.status === 403) {
        router.push("/unauthorized");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to load appointments.");
        setAppointments([]);
      } else {
        setAppointments(
          (data || []).map((appointment: any) => ({
            id: appointment.id,
            appointmentCode: appointment.appointmentCode,
            customerCode: appointment.customer?.customerCode || "",
            customerName: appointment.customer?.name || "",
            schedule: appointment.schedule?.formatted || "",
            barberName: appointment.barber?.name || "",
            serviceName: appointment.service?.name || "",
            totalAmount:
              appointment.payment?.amount !== undefined &&
              appointment.payment?.amount !== null
                ? appointment.payment.amount
                : null,
            status: appointment.status || "",
          }))
        );
        setError("");
      }
    } catch (error) {
      setError("Unable to load appointments.");
      setAppointments([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (status === "loading") return;

    const role = (session?.user as { role?: string })?.role;

    if (!session?.user?.email || !["OWNER", "RECEPTIONIST"].includes(role || "")) {
      router.push("/unauthorized");
      return;
    }

    loadAppointments();
  }, [session, status, router]);

  const formatAmount = (amount: number | string | null) => {
    if (amount === null || amount === undefined) {
      return "-";
    }

    const parsed = typeof amount === "string" ? parseFloat(amount) : amount;
    if (parsed === null || parsed === undefined || Number.isNaN(parsed)) {
      return "-";
    }

    return `₱ ${parsed.toFixed(2)}`;
  };

  {/* Pending Appointments */}
  const filteredPendingAppointments = appointments.filter((appointment) => {
    return appointment.status === "PENDING";
  });

  const paginatedPendingAppointments = filteredPendingAppointments.slice(
    (pendingPage - 1) * itemsPerPage,
    pendingPage * itemsPerPage
  );

  const totalPagesPending = Math.ceil(
    filteredPendingAppointments.length / itemsPerPage
  );

  {/* Processed Appointments */}
  const filteredProcessedAppointments = appointments.filter((appointment) => {
    return appointment.status !== "PENDING";
  });

  const paginatedProcessedAppointments = filteredProcessedAppointments.slice(
    (processedPage - 1) * itemsPerPage,
    processedPage * itemsPerPage
  );

  const totalPagesProcessed = Math.ceil(
    filteredProcessedAppointments.length / itemsPerPage
  );

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const res = await fetch(`/api/admin/appointments/${selectedAppointment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedAppointment),
      });

      if (!res.ok) {
        throw new Error("Failed to update appointment.");
      }

      // Refresh the appointment list
      await loadAppointments();
    } catch (error) {
      console.error("Error updating appointment:", error);
    }
  }
  return (
    <Box sx={{ flex: 1, p: 4, backgroundColor: "#fff" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 4,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          Appointments
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Pending appointments
        </Typography>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : appointments.length === 0 ? (
        <Typography sx={{ textAlign: "center", color: "text.secondary" }}>
          No appointments found.
        </Typography>
      ) : (
        <>
          <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Appointment#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Schedule</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Barber Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPendingAppointments.map((appointment) => (
                <TableRow
                  key={appointment.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#fafafa',
                    },
                  }}
                >
                  <TableCell>{appointment.appointmentCode}</TableCell>
                  <TableCell>{appointment.customerCode}</TableCell>
                  <TableCell>{appointment.customerName}</TableCell>
                  <TableCell>{appointment.schedule}</TableCell>
                  <TableCell>{appointment.serviceName}</TableCell>
                  <TableCell>{appointment.barberName}</TableCell>
                  <TableCell>{formatAmount(appointment.totalAmount)}</TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color:
                        appointment.status === 'Completed'
                          ? 'green'
                          : appointment.status === 'Cancelled'
                          ? 'red'
                          : '#333',
                    }}
                  >
                    {appointment.status}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      aria-label="view appointment"
                      onClick={() => {
                        console.log('View appointment', appointment.id);
                      }}
                    >
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* PAGINATION CONTROLS * */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 4,
          }}
        >
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: 14,
            }}
          >
            Showing 1 to {paginatedPendingAppointments.length} of{' '}
            {filteredPendingAppointments.length} Entries
          </Typography>

          <Pagination
            count={totalPagesPending}
            page={pendingPage}
            onChange={(_, value) => setPendingPage(value)}
            size="small"
          />
        </Box>
        </>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mt: 1,
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Processed appointments
        </Typography>
      </Box>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : appointments.length === 0 ? (
        <Typography sx={{ textAlign: "center", color: "text.secondary" }}>
          No appointments found.
        </Typography>
      ) : (
        <>
          <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Appointment#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Schedule</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Barber Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedProcessedAppointments.map((appointment) => (
                <TableRow
                  key={appointment.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#fafafa',
                    },
                  }}
                >
                  <TableCell>{appointment.appointmentCode}</TableCell>
                  <TableCell>{appointment.customerCode}</TableCell>
                  <TableCell>{appointment.customerName}</TableCell>
                  <TableCell>{appointment.schedule}</TableCell>
                  <TableCell>{appointment.serviceName}</TableCell>
                  <TableCell>{appointment.barberName}</TableCell>
                  <TableCell>{formatAmount(appointment.totalAmount)}</TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color:
                        appointment.status === 'Completed'
                          ? 'green'
                          : appointment.status === 'Cancelled'
                          ? 'red'
                          : '#333',
                    }}
                  >
                    {appointment.status}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      aria-label="view appointment"
                      onClick={() => {
                        console.log('View appointment', appointment.id);
                      }}
                    >
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* PAGINATION CONTROLS * */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 4,
          }}
        >
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: 14,
            }}
          >
            Showing 1 to {paginatedProcessedAppointments.length} of{' '}
            {filteredProcessedAppointments.length} Entries
          </Typography>

          <Pagination
            count={totalPagesProcessed}
            page={processedPage}
            onChange={(_, value) => setProcessedPage(value)}
            size="small"
          />
        </Box>
        </>
      )}
    </Box>
  );
}
