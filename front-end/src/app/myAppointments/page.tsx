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

import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import CancelIcon from "@mui/icons-material/Cancel";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import StarIcon from "@mui/icons-material/Star";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatbotFloatingButton from "@/components/ChatbotFloatingButton";

type HistoryService = {
  id: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type CustomerHistory = {
  id: string;
  type: "APPOINTMENT" | "WALKIN";
  saleId?: string | null;
  appointmentId?: string | null;
  appointmentCode: string;
  saleCode?: string | null;
  barberName: string;
  serviceName: string;
  services: HistoryService[];
  appointmentDate: string;
  schedule: string;
  subtotal: number;
  discount: number;
  discountPercent: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentScreenshotUrl?: string | null;
};

const itemsPerPage = 5;

function formatAmount(amount: number) {
  return `₱ ${Number(amount || 0).toFixed(2)}`;
}

function formatDisplayType(type: CustomerHistory["type"]) {
  return type === "APPOINTMENT" ? "Appointment" : "Walk-in";
}

export default function MyAppointmentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [history, setHistory] = useState<CustomerHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [selectedItem, setSelectedItem] = useState<CustomerHistory | null>(null);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadHistory = async () => {
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
        setHistory([]);
        return;
      }

      if (!res.ok) {
        console.error("LOAD CUSTOMER HISTORY ERROR:", data);
        setHistory([]);
        return;
      }

      setHistory(data.appointments || []);
    } catch (error) {
      console.error("LOAD CUSTOMER HISTORY FETCH ERROR:", error);
      setHistory([]);
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

    loadHistory();
  }, [session, status, router]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const value = search.toLowerCase();

      const matchesSearch =
        item.appointmentCode.toLowerCase().includes(value) ||
        (item.saleCode || "").toLowerCase().includes(value) ||
        item.barberName.toLowerCase().includes(value) ||
        item.serviceName.toLowerCase().includes(value) ||
        item.schedule.toLowerCase().includes(value) ||
        item.status.toLowerCase().includes(value) ||
        formatDisplayType(item.type).toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "ALL" || item.status.toUpperCase() === statusFilter;

      const matchesType = typeFilter === "ALL" || item.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [history, search, statusFilter, typeFilter]);

  const paginatedHistory = filteredHistory.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));

  const showingFrom =
    filteredHistory.length === 0 ? 0 : (page - 1) * itemsPerPage + 1;

  const showingTo = Math.min(page * itemsPerPage, filteredHistory.length);

  const getStatusColor = (itemStatus: string) => {
    const value = itemStatus.toUpperCase();

    if (value === "PENDING") return "#92400E";
    if (value === "SCHEDULED") return "#2563eb";
    if (value === "COMPLETED") return "green";
    if (value === "PAID") return "green";
    if (value === "CANCELLED") return "#EA580C";
    if (value === "REJECTED") return "#DC2626";
    if (value === "NOSHOW") return "#1F2937";
    if (value === "PARTIAL") return "#7C3AED";
    if (value === "REFUNDED") return "#0F766E";

    return "#333";
  };

  const canCancel = (item: CustomerHistory) => {
    return (
      item.type === "APPOINTMENT" &&
      ["PENDING", "SCHEDULED"].includes(item.status.toUpperCase())
    );
  };

  const handleCancelAppointment = async () => {
    if (!selectedItem?.appointmentId) return;

    try {
      setSaving(true);

      const res = await fetch(
        `/api/customers/appointments/${selectedItem.appointmentId}/cancel`,
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
      setSelectedItem(null);
      await loadHistory();
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
            placeholder="Search history..."
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
            <MenuItem value="PAID">Paid</MenuItem>
            <MenuItem value="PARTIAL">Partial</MenuItem>
            <MenuItem value="REFUNDED">Refunded</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            sx={{ width: 180, bgcolor: "#fff" }}
          >
            <MenuItem value="ALL">All Type</MenuItem>
            <MenuItem value="APPOINTMENT">Appointment</MenuItem>
            <MenuItem value="WALKIN">Walk-in</MenuItem>
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
                  Type
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
              {paginatedHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No history found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                      {item.saleCode || item.appointmentCode}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                      {formatDisplayType(item.type)}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                      {item.barberName}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900 }}>
                      {item.serviceName}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900 }}>
                      {item.schedule || item.appointmentDate}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900 }}>
                      {formatAmount(item.totalAmount)}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight: 900,
                        color: getStatusColor(item.status),
                      }}
                    >
                      {item.status}
                    </TableCell>

                    <TableCell>
                      <IconButton
                        size="small"
                        disabled={!canCancel(item)}
                        onClick={() => {
                          setSelectedItem(item);
                          setCancelOpen(true);
                        }}
                        sx={{
                          bgcolor: canCancel(item) ? "#ff5252" : "#ddd",
                          width: 28,
                          height: 28,
                          mr: 0.5,
                        }}
                      >
                        <CancelIcon sx={{ fontSize: 17, color: "#fff" }} />
                      </IconButton>

                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedItem(item);
                          setReceiptOpen(true);
                        }}
                        sx={{ bgcolor: "#ddd", width: 28, height: 28, mr: 0.5 }}
                      >
                        <ReceiptLongIcon sx={{ fontSize: 17 }} />
                      </IconButton>

                      {item.status.toUpperCase() === "COMPLETED" && (
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
            Showing {showingFrom} to {showingTo} of {filteredHistory.length} Entries
          </Typography>

          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            size="small"
          />
        </Box>
      </Box>

      <Dialog open={receiptOpen} onClose={() => setReceiptOpen(false)} maxWidth="md" fullWidth>
        <Box sx={{ p: 4, bgcolor: "#f3f3f3", position: "relative" }}>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography
              sx={{
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              {session?.user?.name || "Customer"}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#888",
                }}
              >
                {selectedItem?.saleCode || selectedItem?.appointmentCode}
              </Typography>

              <IconButton
                onClick={() => setReceiptOpen(false)}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  color: "#666",

                  "&:hover": {
                    bgcolor: "#e8e8e8",
                    color: "#000",
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <TableContainer sx={{ bgcolor: "#fff", mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>Barber</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>Service Type</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>Price</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {(selectedItem?.services || []).map((service) => (
                  <TableRow key={service.id}>
                    <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                      {selectedItem?.barberName}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                      {service.serviceName}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                      {service.quantity}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                      {selectedItem?.schedule}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                      {formatAmount(service.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ width: 400, mx: "auto" }}>
            {[
              ["Subtotal", formatAmount(selectedItem?.subtotal || 0)],
              ["Discount", formatAmount(selectedItem?.discount || 0)],
              ["Discount %", `${Number(selectedItem?.discountPercent || 0)}%`],
              ["Total Payment", formatAmount(selectedItem?.totalAmount || 0)],
              ["Mode of Payment", selectedItem?.paymentMethod || "N/A"],
              ["Payment Status", selectedItem?.paymentStatus || "N/A"],
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
            {selectedItem?.appointmentCode}?
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
