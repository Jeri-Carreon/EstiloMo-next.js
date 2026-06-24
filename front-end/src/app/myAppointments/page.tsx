"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Card from "@mui/material/Card";
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
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import StarIcon from "@mui/icons-material/Star";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PaymentsIcon from "@mui/icons-material/Payments";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";

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
  date?: string;
  time?: string;
  schedule: string;
  subtotal: number;
  discount: number;
  discountPercent: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentScreenshotUrl?: string | null;
  afterServicePhotoUrl?: string | null;
};

type RecommendedService = {
  id: string;
  name: string;
  price: number;
  image: string;
  reason: string;
};

const itemsPerPage = 5;

function formatAmount(amount: number) {
  return `₱ ${Number(amount || 0).toFixed(2)}`;
}

function formatPeso(value: number) {
  return `₱ ${Number(value || 0).toLocaleString("en-PH")}`;
}

function formatDisplayType(type: CustomerHistory["type"]) {
  return type === "APPOINTMENT" ? "Appointment" : "Walk-in";
}

function splitSchedule(schedule: string) {
  return String(schedule || "").split("\n").filter(Boolean);
}

export default function MyAppointmentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState("Customer");
  const [authLoading, setAuthLoading] = useState(true);
  const [history, setHistory] = useState<CustomerHistory[]>([]);
  const [recommendedServices, setRecommendedServices] = useState<
    RecommendedService[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [selectedItem, setSelectedItem] = useState<CustomerHistory | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const [imageOpen, setImageOpen] = useState(false);
  const [imageTitle, setImageTitle] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

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
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        console.error("LOAD CUSTOMER HISTORY ERROR:", data);
        setHistory([]);
        setRecommendedServices([]);
        return;
      }

      setHistory(data.appointments || []);
      setRecommendedServices(data.recommendedServices || []);
    } catch (error) {
      console.error("LOAD CUSTOMER HISTORY FETCH ERROR:", error);
      setHistory([]);
      setRecommendedServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setDisplayName(user.user_metadata?.full_name || user.email || "Customer");
      setAuthLoading(false);
      await loadHistory();
    };

    init();
  }, []);

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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredHistory.length / itemsPerPage)
  );

  const showingFrom =
    filteredHistory.length === 0 ? 0 : (page - 1) * itemsPerPage + 1;

  const showingTo = Math.min(page * itemsPerPage, filteredHistory.length);

  const getStatusColor = (itemStatus: string) => {
    const value = itemStatus.toUpperCase();

    if (value === "PENDING") return "#92400E";
    if (value === "SCHEDULED") return "#2563eb";
    if (value === "COMPLETED") return "green";
    if (value === "DONE") return "green";
    if (value === "PAID") return "green";
    if (value === "CANCELLED") return "#EA580C";
    if (value === "REJECTED") return "#DC2626";
    if (value === "NOSHOW") return "#1F2937";
    if (value === "PARTIAL") return "#7C3AED";
    if (value === "REFUNDED") return "#0F766E";

    return "#333";
  };

  const openImagePreview = (title: string, url?: string | null) => {
    setImageTitle(title);
    setImageUrl(url || null);
    setImageOpen(true);
  };

  if (authLoading || loading) {
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
            <MenuItem value="DONE">Done</MenuItem>
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
                <TableCell sx={{ fontWeight: 900 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
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

                    <TableCell sx={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                      {item.date || splitSchedule(item.schedule || item.appointmentDate)[0]}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                      {item.time || "N/A"}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight: 900,
                        minWidth: 120,
                        whiteSpace: "nowrap",
                      }}
                    >
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
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton
                          size="small"
                          disabled={!item.afterServicePhotoUrl}
                          onClick={() =>
                            openImagePreview(
                              "After-Service Photo",
                              item.afterServicePhotoUrl
                            )
                          }
                          sx={{
                            bgcolor: item.afterServicePhotoUrl
                              ? "#e5e5e5"
                              : "#f1f1f1",
                            width: 34,
                            height: 34,
                            color: item.afterServicePhotoUrl ? "#555" : "#aaa",
                            "&:hover": {
                              bgcolor: item.afterServicePhotoUrl
                                ? "#d4d4d4"
                                : "#f1f1f1",
                            },
                          }}
                        >
                          <PhotoCameraIcon sx={{ fontSize: 18 }} />
                        </IconButton>

                        <IconButton
                          size="small"
                          disabled={!item.paymentScreenshotUrl}
                          onClick={() =>
                            openImagePreview(
                              "Payment Screenshot",
                              item.paymentScreenshotUrl
                            )
                          }
                          sx={{
                            bgcolor: item.paymentScreenshotUrl
                              ? "#e5e5e5"
                              : "#f1f1f1",
                            width: 34,
                            height: 34,
                            color: item.paymentScreenshotUrl ? "#555" : "#aaa",
                            "&:hover": {
                              bgcolor: item.paymentScreenshotUrl
                                ? "#d4d4d4"
                                : "#f1f1f1",
                            },
                          }}
                        >
                          <PaymentsIcon sx={{ fontSize: 18 }} />
                        </IconButton>

                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedItem(item);
                            setReceiptOpen(true);
                          }}
                          sx={{
                            bgcolor: "#e5e5e5",
                            width: 34,
                            height: 34,
                            color: "#555",
                            "&:hover": { bgcolor: "#d4d4d4" },
                          }}
                        >
                          <ReceiptLongIcon sx={{ fontSize: 18 }} />
                        </IconButton>

                        {["COMPLETED", "DONE"].includes(
                          item.status.toUpperCase()
                        ) && (
                          <IconButton
                            size="small"
                            onClick={() => router.push("/myReviews")}
                            sx={{
                              bgcolor: "#e5e5e5",
                              width: 34,
                              height: 34,
                              color: "#555",
                              "&:hover": { bgcolor: "#d4d4d4" },
                            }}
                          >
                            <StarIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                      </Box>
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
            Showing {showingFrom} to {showingTo} of {filteredHistory.length}{" "}
            Entries
          </Typography>

          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            size="small"
          />
        </Box>

        {recommendedServices.length > 0 && (
          <Box sx={{ mt: 8 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <BookmarkBorderIcon />

              <Typography sx={{ fontSize: 24, fontWeight: 900 }}>
                Recommended For You
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, minmax(280px, 320px))",
                },
                justifyContent: "space-evenly",
                gap: 4,
                width: "100%",
              }}
            >
              {recommendedServices.map((service) => (
                <Card
                  key={service.id}
                  elevation={0}
                  sx={{
                    bgcolor: "#d9d9d9",
                    borderRadius: 0,
                    p: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: 170,
                      position: "relative",
                      mb: 1.5,
                      bgcolor: "#ccc",
                    }}
                  >
                    <Box
                      component="img"
                      src={service.image || "/images/service-placeholder.jpg"}
                      alt={service.name}
                      onError={(event) => {
                        event.currentTarget.src =
                          "/images/service-placeholder.jpg";
                      }}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </Box>

                  <Typography sx={{ fontWeight: 800, fontSize: 15 }}>
                    {service.name} - {formatPeso(service.price)}
                  </Typography>

                  <Typography sx={{ fontSize: 11, mb: 1.5 }}>
                    {service.reason}
                  </Typography>

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => router.push("/appointment")}
                    sx={{
                      bgcolor: "#000",
                      color: "#fff",
                      borderRadius: 5,
                      fontSize: 11,
                      fontWeight: 700,
                      py: 0.7,
                      "&:hover": {
                        bgcolor: "#222",
                      },
                    }}
                  >
                    Book Now
                  </Button>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <Dialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ p: 4, bgcolor: "#f3f3f3", position: "relative" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography sx={{ fontSize: 22, fontWeight: 900 }}>
              {displayName}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#888" }}>
                {selectedItem?.saleCode || selectedItem?.appointmentCode}
              </Typography>

              <IconButton
                onClick={() => setReceiptOpen(false)}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  color: "#666",
                  "&:hover": { bgcolor: "#e8e8e8", color: "#000" },
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
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                    Barber
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                    Service Type
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                    Qty
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                    Date
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                    Time
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                    Price
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {(selectedItem?.services || []).map((service, index) => (
                  <TableRow key={`${service.id}-${index}`}>
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
                      {selectedItem?.date ||
                        splitSchedule(selectedItem?.schedule || "")[0]}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900, color: "#888" }}>
                      {selectedItem?.time || "N/A"}
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 900,
                        color: "#888",
                        whiteSpace: "nowrap",
                        minWidth: 110,
                      }}
                    >
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

      <Dialog
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 4, bgcolor: "#f3f3f3", position: "relative" }}>
          <IconButton
            onClick={() => setImageOpen(false)}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              color: "#555",
            }}
          >
            <CloseIcon />
          </IconButton>

          <Typography
            align="center"
            sx={{ fontSize: 20, fontWeight: 900, mb: 3 }}
          >
            {imageTitle}
          </Typography>

          {imageUrl ? (
            <Box
              component="img"
              src={imageUrl}
              alt={imageTitle}
              sx={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "70vh",
                mx: "auto",
                borderRadius: 2,
                objectFit: "contain",
                bgcolor: "#fff",
              }}
            />
          ) : (
            <Typography align="center">No image available.</Typography>
          )}
        </Box>
      </Dialog>

      <Footer />
      <ChatbotFloatingButton />
    </>
  );
}