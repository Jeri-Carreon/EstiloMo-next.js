"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Pagination from "@mui/material/Pagination";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";

import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import CancelIcon from "@mui/icons-material/Cancel";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import StarIcon from "@mui/icons-material/Star";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatbotFloatingButton from "@/components/ChatbotFloatingButton";

type Appointment = {
  id: string;
  appointmentCode: string;
  barberName: string;
  serviceName: string;
  appointmentDate: string;
  schedule: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentScreenshotUrl?: string | null;
};

const itemsPerPage = 5;

export default function MyAppointmentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAppointments = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/customers/appointments", {
        cache: "no-store",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const text = await res.text();

      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("API returned non-JSON:", text);
        setAppointments([]);
        return;
      }

      if (!res.ok) {
        console.error("LOAD APPOINTMENTS ERROR:", data);
        setAppointments([]);
        return;
      }

      setAppointments(data.appointments || []);
    } catch (error) {
      console.error("LOAD APPOINTMENTS FETCH ERROR:", error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.email) {
      router.push("/login");
      return;
    }

    loadAppointments();
  }, [session, status, router]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const value = search.toLowerCase();

      const matchesSearch =
        appointment.appointmentCode.toLowerCase().includes(value) ||
        appointment.barberName.toLowerCase().includes(value) ||
        appointment.serviceName.toLowerCase().includes(value) ||
        appointment.schedule.toLowerCase().includes(value) ||
        appointment.status.toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "ALL" ||
        appointment.status.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [appointments, search, statusFilter]);

  const paginatedAppointments = filteredAppointments.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  const getStatusColor = (appointmentStatus: string) => {
    const value = appointmentStatus.toUpperCase();

    if (value === "PENDING") return "#92400E";
    if (value === "SCHEDULED") return "#2563eb";
    if (value === "COMPLETED") return "green";
    if (value === "CANCELLED") return "#EA580C";
    if (value === "REJECTED") return "#DC2626";
    if (value === "NOSHOW") return "#1F2937";

    return "#333";
  };

  const formatAmount = (amount: number) => {
    return `₱ ${Number(amount || 0).toFixed(2)}`;
  };

  const canCancel = (appointment: Appointment) => {
    return ["PENDING", "SCHEDULED"].includes(appointment.status.toUpperCase());
  };

  const canUploadProof = (appointment: Appointment) => {
    return appointment.status.toUpperCase() === "PENDING";
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      setSaving(true);

      const res = await fetch(
        `/api/customers/appointments/${selectedAppointment.id}/cancel`,
        {
          method: "PUT",
        }
      );

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        alert(data.error || "Failed to cancel appointment");
        return;
      }

      setCancelOpen(false);
      setSelectedAppointment(null);
      await loadAppointments();
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadProof = async () => {
    if (!selectedAppointment || !proofFile) return;

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("file", proofFile);

      const res = await fetch(
        `/api/customers/appointments/${selectedAppointment.id}/payment-proof`,
        {
          method: "POST",
          body: formData,
        }
      );

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        alert(data.error || "Failed to upload proof");
        return;
      }

      setProofOpen(false);
      setProofFile(null);
      setSelectedAppointment(null);
      await loadAppointments();
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <>
        <Navbar />
        <Box
          sx={{
            minHeight: "60vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CircularProgress />
        </Box>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <Box sx={{ bgcolor: "#fff", minHeight: "70vh", px: 4, py: 5 }}>
        <Typography align="center" sx={{ fontSize: 34, fontWeight: 900, mb: 3 }}>
          My Appointments
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <Button
            onClick={() => router.push("/appointment")}
            sx={{
              bgcolor: "#ddd",
              color: "#111",
              px: 4,
              py: 1.4,
              borderRadius: 5,
              fontWeight: 900,
              textTransform: "none",
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
              "&:hover": { bgcolor: "#ccc" },
            }}
          >
            Book an Appointment!
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search appointments..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#999" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, maxWidth: 320 }}
          />

          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            sx={{ width: 180, bgcolor: "#fff" }}
          >
            <MenuItem value="ALL">All Status</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="SCHEDULED">Scheduled</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
            <MenuItem value="NOSHOW">No Show</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
          </TextField>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                  Transaction #
                </TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                  Barber
                </TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                      {appointment.appointmentCode}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                      {appointment.barberName}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900 }}>
                      {appointment.serviceName}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900 }}>
                      {appointment.schedule || appointment.appointmentDate}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900 }}>
                      {formatAmount(appointment.totalAmount)}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight: 900,
                        color: getStatusColor(appointment.status),
                      }}
                    >
                      {appointment.status}
                    </TableCell>

                    <TableCell>
                      <IconButton
                        size="small"
                        disabled={!canCancel(appointment)}
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setCancelOpen(true);
                        }}
                        sx={{
                          bgcolor: canCancel(appointment) ? "#ff5252" : "#ddd",
                          width: 28,
                          height: 28,
                          mr: 0.5,
                        }}
                      >
                        <CancelIcon sx={{ fontSize: 17, color: "#fff" }} />
                      </IconButton>

                      <IconButton
                        size="small"
                        disabled={!canUploadProof(appointment)}
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setProofOpen(true);
                        }}
                        sx={{
                          bgcolor: canUploadProof(appointment) ? "#ddd" : "#eee",
                          width: 28,
                          height: 28,
                          mr: 0.5,
                        }}
                      >
                        <UploadFileIcon sx={{ fontSize: 17 }} />
                      </IconButton>

                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setReceiptOpen(true);
                        }}
                        sx={{ bgcolor: "#ddd", width: 28, height: 28, mr: 0.5 }}
                      >
                        <ReceiptLongIcon sx={{ fontSize: 17 }} />
                      </IconButton>

                      {appointment.status.toUpperCase() === "COMPLETED" && (
                        <IconButton
                          size="small"
                          onClick={() => router.push("/myReviews")}
                          sx={{ bgcolor: "#ddd", width: 28, height: 28 }}
                        >
                          <StarIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 3,
          }}
        >
          <Typography sx={{ fontSize: 14 }}>
            Showing {paginatedAppointments.length} of{" "}
            {filteredAppointments.length} Entries
          </Typography>

          <Pagination
            count={totalPages || 1}
            page={page}
            onChange={(_, value) => setPage(value)}
            size="small"
          />
        </Box>
      </Box>

      <Dialog open={receiptOpen} onClose={() => setReceiptOpen(false)} maxWidth="md" fullWidth>
        <Box sx={{ p: 4, bgcolor: "#f3f3f3", position: "relative" }}>
          <IconButton
            onClick={() => setReceiptOpen(false)}
            sx={{ position: "absolute", right: 14, top: 12 }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 900 }}>
              {session?.user?.name || "Customer"}
            </Typography>

            <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#888" }}>
              {selectedAppointment?.appointmentCode}
            </Typography>
          </Box>

          <TableContainer sx={{ bgcolor: "#fff", mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>Barber</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>Service Type</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>Price</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                    {selectedAppointment?.barberName}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                    {selectedAppointment?.serviceName}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                    {selectedAppointment?.schedule}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                    {formatAmount(selectedAppointment?.totalAmount || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ width: 400, mx: "auto" }}>
            {[
              ["Subtotal", formatAmount(selectedAppointment?.totalAmount || 0)],
              ["Discount", "₱ 0"],
              ["Total Payment", formatAmount(selectedAppointment?.totalAmount || 0)],
              ["Mode of Payment", selectedAppointment?.paymentMethod || "N/A"],
              ["Payment Status", selectedAppointment?.paymentStatus || "N/A"],
            ].map(([label, value]) => (
              <Box
                key={label}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  bgcolor: "#fff",
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  mb: 0.4,
                }}
              >
                <Typography sx={{ fontWeight: 900 }}>{label}</Typography>
                <Typography sx={{ fontWeight: 900, color: "#777" }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Dialog>

      <Dialog open={proofOpen} onClose={() => setProofOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 4, bgcolor: "#f3f3f3", position: "relative" }}>
          <IconButton
            onClick={() => setProofOpen(false)}
            sx={{ position: "absolute", right: 14, top: 12 }}
          >
            <CloseIcon />
          </IconButton>

          <Typography sx={{ fontSize: 22, fontWeight: 900, mb: 3 }}>
            Proof of Payment
          </Typography>

          {selectedAppointment?.paymentScreenshotUrl ? (
            <Box
              component="img"
              src={selectedAppointment.paymentScreenshotUrl}
              sx={{
                display: "block",
                maxWidth: "100%",
                maxHeight: 520,
                mx: "auto",
                objectFit: "contain",
              }}
            />
          ) : (
            <>
              <Button
                component="label"
                sx={{
                  bgcolor: "#fff",
                  color: "#777",
                  justifyContent: "flex-start",
                  textTransform: "none",
                  py: 1.3,
                  width: "100%",
                  mb: 3,
                }}
              >
                + {proofFile ? proofFile.name : "Upload Payment Screenshot"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
              </Button>

              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Button
                  disabled={saving || !proofFile}
                  onClick={handleUploadProof}
                  sx={{
                    bgcolor: "#000",
                    color: "#ffc400",
                    width: 160,
                    py: 1.3,
                    textTransform: "none",
                    "&:hover": { bgcolor: "#111" },
                  }}
                >
                  {saving ? "Uploading..." : "Upload"}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 4, bgcolor: "#f3f3f3", textAlign: "center" }}>
          <Box
            sx={{
              width: 150,
              height: 150,
              borderRadius: "50%",
              bgcolor: "red",
              mx: "auto",
              mb: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
            }}
          >
            <CloseIcon sx={{ fontSize: 95, color: "#fff" }} />
          </Box>

          <Typography sx={{ fontSize: 22, fontWeight: 900, mb: 2 }}>
            Are you sure you want to cancel your booking appointment #
            {selectedAppointment?.appointmentCode}?
          </Typography>

          <Typography sx={{ color: "#888", mb: 3 }}>
            Your downpayment will not be refunded upon cancellation.
            <Box component="span" sx={{ color: "red" }}> *</Box>
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              onClick={() => setCancelOpen(false)}
              sx={{
                bgcolor: "#ddd",
                color: "#111",
                width: 150,
                borderRadius: 5,
                textTransform: "none",
                fontWeight: 800,
              }}
            >
              Return
            </Button>

            <Button
              disabled={saving}
              onClick={handleCancelAppointment}
              sx={{
                bgcolor: "red",
                color: "#111",
                width: 150,
                borderRadius: 5,
                textTransform: "none",
                fontWeight: 800,
                "&:hover": { bgcolor: "#e00000" },
              }}
            >
              {saving ? "Cancelling..." : "Cancel"}
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Footer />
      <ChatbotFloatingButton />
    </>
  );
}