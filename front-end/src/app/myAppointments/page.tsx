"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

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
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";

import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import StarIcon from "@mui/icons-material/Star";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PaymentsIcon from "@mui/icons-material/Payments";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

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
  afterServicePhotoUrls?: string[];
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
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("Customer");
  const [authLoading, setAuthLoading] = useState(true);

  const {
    data: historyData,
    isLoading: loading,
  } = useQuery<{
    appointments: CustomerHistory[];
    recommendedServices: RecommendedService[];
  }>({
    queryKey: ["customerAppointmentsHistory"],
    queryFn: async () => {
      const res = await fetch("/api/customers/appointments", {
        cache: "no-store",
      });

      if (res.status === 401) {
        router.push("/login?redirect=/myAppointments");
        return {
          appointments: [],
          recommendedServices: [],
        };
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        console.error("LOAD CUSTOMER HISTORY ERROR:", data);
        return {
          appointments: [],
          recommendedServices: [],
        };
      }

      return {
        appointments: data.appointments || [],
        recommendedServices: data.recommendedServices || [],
      };
    },
    enabled: !authLoading,
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  const history = historyData?.appointments || [];
  const recommendedServices = historyData?.recommendedServices || [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [selectedItem, setSelectedItem] = useState<CustomerHistory | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageTitle, setImageTitle] = useState("");
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        router.push("/login?redirect=/myAppointments");
        return;
      }

      setDisplayName(user.user_metadata?.full_name || user.email || "Customer");
      setAuthLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_OUT") {
          router.replace("/");
          router.refresh();
          return;
        }

        if (event === "SIGNED_IN" && session?.user) {
          setDisplayName(
            session.user.user_metadata?.full_name ||
              session.user.email ||
              "Customer"
          );
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentUrl = new URL(window.location.href);
    const paymentResult = currentUrl.searchParams.get("payment");
    const saleId = currentUrl.searchParams.get("saleId");
    const saleCode = currentUrl.searchParams.get("saleCode");

    if (paymentResult === "success" && (saleId || saleCode)) {
      window.history.replaceState({}, "", "/myAppointments");

      const timer = window.setInterval(async () => {
        try {
          const params = new URLSearchParams();
          if (saleId) params.set("saleId", saleId);
          if (saleCode) params.set("saleCode", saleCode);
          params.set("confirmReturn", "1");

          const res = await fetch(`/api/appointment/payment-status?${params}`);
          const data = await res.json();

          if (res.ok && data.isScheduled) {
            window.clearInterval(timer);
            window.localStorage.removeItem("estilomoPendingCheckout");
            queryClient.invalidateQueries({
              queryKey: ["customerAppointmentsHistory"],
            });
            setBookingSuccessOpen(true);
            return;
          }

          if (
            res.ok &&
            data.downPaymentStatus &&
            ["FAILED", "CANCELLED", "EXPIRED"].includes(
              String(data.downPaymentStatus).toUpperCase()
            )
          ) {
            window.clearInterval(timer);
            window.localStorage.removeItem("estilomoPendingCheckout");
          }
        } catch (error) {
          console.error(error);
        }
      }, 2000);

      return () => window.clearInterval(timer);
    }

    if (paymentResult === "cancel") {
      window.history.replaceState({}, "", "/myAppointments");
    }
  }, [queryClient]);

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

  const getAfterServicePhotos = (item: CustomerHistory) => {
    if (item.afterServicePhotoUrls && item.afterServicePhotoUrls.length > 0) {
      return item.afterServicePhotoUrls;
    }

    if (item.afterServicePhotoUrl) {
      return [item.afterServicePhotoUrl];
    }

    return [];
  };

  const openImagePreview = (title: string, urls: string[]) => {
    setImageTitle(title);
    setImageUrls(urls);
    setImageIndex(0);
    setImageOpen(true);
  };

  const renderHistoryActions = (item: CustomerHistory) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      {(() => {
        const photos = getAfterServicePhotos(item);

        return (
          <IconButton
            size="small"
            aria-label="View after-service photos"
            disabled={photos.length === 0}
            onClick={() => openImagePreview("After-Service Photos", photos)}
            sx={{
              bgcolor: photos.length > 0 ? "#e5e5e5" : "#f1f1f1",
              width: 34,
              height: 34,
              color: photos.length > 0 ? "#555" : "#aaa",
              "&:hover": {
                bgcolor: photos.length > 0 ? "#d4d4d4" : "#f1f1f1",
              },
            }}
          >
            <PhotoCameraIcon sx={{ fontSize: 18 }} />
          </IconButton>
        );
      })()}

      <IconButton
        size="small"
        aria-label="View receipt"
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

      {["COMPLETED", "DONE"].includes(item.status.toUpperCase()) && (
        <IconButton
          size="small"
          aria-label="Write review"
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
  );

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

      <Box
        sx={{
          bgcolor: "#fff",
          minHeight: "70vh",
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 3, sm: 4, md: 5 },
          overflowX: "hidden",
        }}
      >
        <Typography
          align="center"
          sx={{ fontSize: { xs: 28, sm: 34 }, fontWeight: 900, mb: 3 }}
        >
          My Appointments
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", mb: { xs: 3, md: 4 } }}>
          <Button
            onClick={() => router.push("/appointment")}
            sx={{
              bgcolor: "#ddd",
              color: "#111",
              width: { xs: "100%", sm: "auto" },
              maxWidth: 360,
              px: { xs: 2, sm: 4 },
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
            sx={{
              flex: { xs: "1 1 100%", md: 1 },
              maxWidth: { xs: "100%", md: 320 },
              bgcolor: "#fff",
            }}
          />

          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            sx={{ width: { xs: "100%", sm: 180 }, bgcolor: "#fff" }}
          >
            <MenuItem value="ALL">All Status</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="SCHEDULED">Scheduled</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
            <MenuItem value="NOSHOW">No Show</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
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
            sx={{ width: { xs: "100%", sm: 180 }, bgcolor: "#fff" }}
          >
            <MenuItem value="ALL">All Type</MenuItem>
            <MenuItem value="APPOINTMENT">Appointment</MenuItem>
            <MenuItem value="WALKIN">Walk-in</MenuItem>
          </TextField>
        </Box>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ display: { xs: "none", md: "block" } }}
        >
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
                      {renderHistoryActions(item)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            flexDirection: "column",
            gap: 2,
          }}
        >
          {paginatedHistory.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                textAlign: "center",
                border: "1px solid #e5e5e5",
                borderRadius: 2,
              }}
            >
              <Typography sx={{ fontWeight: 800, color: "#666" }}>
                No history found.
              </Typography>
            </Paper>
          ) : (
            paginatedHistory.map((item) => (
              <Paper
                key={item.id}
                elevation={0}
                sx={{
                  p: 2,
                  border: "1px solid #e5e5e5",
                  borderRadius: 2,
                  bgcolor: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        color: "#888",
                        fontSize: 12,
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {formatDisplayType(item.type)}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 18,
                        fontWeight: 900,
                        lineHeight: 1.2,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.serviceName}
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      color: getStatusColor(item.status),
                      fontSize: 12,
                      fontWeight: 900,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {item.status}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.25,
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ color: "#888", fontSize: 12, fontWeight: 800 }}>
                      Transaction #
                    </Typography>
                    <Typography sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
                      {item.saleCode || item.appointmentCode}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={{ color: "#888", fontSize: 12, fontWeight: 800 }}>
                      Barber
                    </Typography>
                    <Typography sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
                      {item.barberName}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={{ color: "#888", fontSize: 12, fontWeight: 800 }}>
                      Date
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>
                      {item.date ||
                        splitSchedule(item.schedule || item.appointmentDate)[0] ||
                        "N/A"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={{ color: "#888", fontSize: 12, fontWeight: 800 }}>
                      Time
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>
                      {item.time || "N/A"}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    borderTop: "1px solid #eee",
                    pt: 1.5,
                  }}
                >
                  <Box>
                    <Typography sx={{ color: "#888", fontSize: 12, fontWeight: 800 }}>
                      Total
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 900 }}>
                      {formatAmount(item.totalAmount)}
                    </Typography>
                  </Box>

                  {renderHistoryActions(item)}
                </Box>
              </Paper>
            ))
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
            mt: 3,
          }}
        >
          <Typography sx={{ fontSize: 14, textAlign: { xs: "center", sm: "left" } }}>
            Showing {showingFrom} to {showingTo} of {filteredHistory.length}{" "}
            Entries
          </Typography>

          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            size="small"
            sx={{ display: "flex", justifyContent: "center" }}
          />
        </Box>

        {recommendedServices.length > 0 && (
          <Box sx={{ mt: { xs: 5, md: 8 } }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 3,
                minWidth: 0,
              }}
            >
              <BookmarkBorderIcon />

              <Typography
                sx={{
                  fontSize: { xs: 21, sm: 24 },
                  fontWeight: 900,
                  overflowWrap: "anywhere",
                }}
              >
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
                gap: { xs: 2, md: 4 },
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
                    p: { xs: 1.5, sm: 2 },
                    minWidth: 0,
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
        slotProps={{
          paper: {
            sx: {
              m: { xs: 1.5, sm: 3 },
              width: { xs: "calc(100% - 24px)", sm: "100%" },
              maxHeight: { xs: "calc(100% - 24px)", sm: "calc(100% - 64px)" },
            },
          },
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 4 },
            bgcolor: "#f3f3f3",
            position: "relative",
            overflowX: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              gap: 1.5,
              mb: { xs: 2, sm: 3 },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 20, sm: 22 },
                fontWeight: 900,
                overflowWrap: "anywhere",
              }}
            >
              {displayName}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: 15, sm: 18 },
                  fontWeight: 900,
                  color: "#888",
                  minWidth: 0,
                  overflowWrap: "anywhere",
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
                  "&:hover": { bgcolor: "#e8e8e8", color: "#000" },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <TableContainer sx={{ bgcolor: "#fff", mb: 2, overflowX: "auto" }}>
            <Table sx={{ minWidth: 680 }}>
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

          <Box sx={{ width: { xs: "100%", sm: 400 }, mx: "auto" }}>
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
                  gap: 2,
                  justifyContent: "space-between",
                  bgcolor: "#fff",
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  mb: 0.4,
                }}
              >
                <Typography sx={{ fontWeight: 900 }}>{label}</Typography>
                <Typography
                  sx={{
                    fontWeight: 900,
                    color: "#777",
                    textAlign: "right",
                    overflowWrap: "anywhere",
                  }}
                >
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
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              overflow: "hidden",
              maxHeight: "90vh",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            fontWeight: 900,
            position: "relative",
          }}
        >
          {imageTitle}

          <IconButton
            onClick={() => setImageOpen(false)}
            sx={{
              position: "absolute",
              right: 12,
              top: 12,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            overflow: "hidden",
            pb: 2,
          }}
        >
          {imageUrls.length > 0 ? (
            <Box>
              <Box
                sx={{
                  position: "relative",
                  bgcolor: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: 2,
                  overflow: "hidden",
                 height: {
                    xs: "55vh",
                    sm: "65vh",
                  },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 2,
                }}
              >
                <Box
                  component="img"
                  src={imageUrls[imageIndex]}
                  alt={`${imageTitle} ${imageIndex + 1}`}
                  sx={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                  }}
                />

                {imageUrls.length > 1 && (
                  <>
                    <IconButton
                      onClick={() =>
                        setImageIndex((prev) =>
                          prev === 0
                            ? imageUrls.length - 1
                            : prev - 1
                        )
                      }
                      sx={{
                        position: "absolute",
                        left: 16,
                        top: "50%",
                        transform: "translateY(-50%)",
                        bgcolor: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        width: 48,
                        height: 48,
                        "&:hover": {
                          bgcolor: "rgba(0,0,0,0.8)",
                        },
                      }}
                    >
                      <ChevronLeftIcon />
                    </IconButton>

                    <IconButton
                      onClick={() =>
                        setImageIndex((prev) =>
                          prev === imageUrls.length - 1
                            ? 0
                            : prev + 1
                        )
                      }
                      sx={{
                        position: "absolute",
                        right: 16,
                        top: "50%",
                        transform: "translateY(-50%)",
                        bgcolor: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        width: 48,
                        height: 48,
                        "&:hover": {
                          bgcolor: "rgba(0,0,0,0.8)",
                        },
                      }}
                    >
                      <ChevronRightIcon />
                    </IconButton>
                  </>
                )}
              </Box>

              {imageUrls.length > 1 && (
                <Typography
                  align="center"
                  sx={{
                    mt: 2,
                    fontWeight: 700,
                    color: "#666",
                  }}
                >
                  Photo {imageIndex + 1} of {imageUrls.length}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography align="center">
              No images available.
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={bookingSuccessOpen}
        onClose={() => setBookingSuccessOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              m: { xs: 2, sm: 3 },
            },
          },
        }}
      >
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            textAlign: "center",
            bgcolor: "#fff",
          }}
        >
          <Box
            sx={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              bgcolor: "#f1f1f1",
              mx: "auto",
              mb: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 58, color: "#2ebd4f" }} />
          </Box>

          <Typography
            sx={{
              fontSize: { xs: 24, sm: 28 },
              fontWeight: 1000,
              color: "#09a84f",
              lineHeight: 1.15,
              mb: 3,
            }}
          >
            Appointment Succesfully Booked
          </Typography>

          <Button
            onClick={() => setBookingSuccessOpen(false)}
            sx={{
              bgcolor: "#f4b400",
              color: "#111",
              borderRadius: 10,
              px: 5,
              py: 1.2,
              textTransform: "none",
              fontWeight: 900,
              "&:hover": { bgcolor: "#e0a800" },
            }}
          >
            OK
          </Button>
        </Box>
      </Dialog>

      <Footer />
      <ChatbotFloatingButton />
    </>
  );
}
