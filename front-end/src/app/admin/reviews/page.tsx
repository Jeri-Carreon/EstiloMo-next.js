"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Rating from "@mui/material/Rating";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import SettingsIcon from "@mui/icons-material/Settings";

type ReviewStatus = "PENDING" | "COMPLETED" | "REJECTED" | "HIDDEN";

type Review = {
  id: string;
  service: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  isVisible: boolean;
  isAnonymous?: boolean;
  createdAt: string;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  appointment?: {
    appointmentCode?: string;
    appointmentDate?: string;
    barber?: {
      firstName: string;
      lastName: string;
    };
    service?: {
      name: string;
    };
  } | null;
  sale?: {
    saleCode?: string;
    source?: "WALKIN" | "BOOKING";
    barber?: {
      firstName: string;
      lastName: string;
    } | null;
    items?: {
      service?: {
        name: string;
      } | null;
    }[];
  } | null;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);

  // session
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [viewReview, setViewReview] = useState<Review | null>(null);
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [editStatus, setEditStatus] = useState<ReviewStatus>("PENDING");
  const [saving, setSaving] = useState(false);

  const loadReviews = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/reviews", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to load customer reviews.");
        setReviews([]);
        return;
      }

      setError("");
      setReviews(data.reviews || []);
    } catch {
      setError("Unable to load customer reviews.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const getCustomerName = (review: Review) => {
    if (review.isAnonymous) return "Anonymous";

    return (
      [review.user?.firstName, review.user?.lastName]
        .filter(Boolean)
        .join(" ") ||
      review.user?.email ||
      "Customer"
    );
  };

  const getBarberName = (review: Review) => {
    if (review.appointment?.barber) {
      return `${review.appointment.barber.firstName} ${review.appointment.barber.lastName}`;
    }

    if (review.sale?.barber) {
      return `${review.sale.barber.firstName} ${review.sale.barber.lastName}`;
    }

    return "N/A";
  };

  const getServiceName = (review: Review) => {
    if (review.appointment?.service?.name) {
      return review.appointment.service.name;
    }

    const saleServices =
      review.sale?.items
        ?.map((item) => item.service?.name)
        .filter(Boolean)
        .join(", ") || "";

    return saleServices || review.service || "N/A";
  };

  const getTransactionNo = (review: Review) => {
    return review.appointment?.appointmentCode || review.sale?.saleCode || "N/A";
  };

  const getTransactionType = (review: Review) => {
    if (review.sale?.source === "WALKIN") return "Walk-in";
    if (review.appointment || review.sale?.source === "BOOKING")
      return "Appointment";
    return "N/A";
  };

  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    if (search.trim()) {
      const keyword = search.toLowerCase();

      result = result.filter((review) => {
        const customerName = getCustomerName(review);
        const barberName = getBarberName(review);
        const serviceName = getServiceName(review);
        const transactionNo = getTransactionNo(review);
        const transactionType = getTransactionType(review);

        return (
          customerName.toLowerCase().includes(keyword) ||
          barberName.toLowerCase().includes(keyword) ||
          serviceName.toLowerCase().includes(keyword) ||
          transactionNo.toLowerCase().includes(keyword) ||
          transactionType.toLowerCase().includes(keyword) ||
          (review.comment || "").toLowerCase().includes(keyword)
        );
      });
    }

    if (statusFilter !== "ALL") {
      result = result.filter((review) => review.status === statusFilter);
    }

    return result;
  }, [reviews, search, statusFilter]);

  const getStatusColor = (status: ReviewStatus) => {
    if (status === "COMPLETED") return "success";
    if (status === "REJECTED") return "error";
    if (status === "HIDDEN") return "default";
    return "warning";
  };

  const handleOpenEdit = (review: Review) => {
    setEditReview(review);
    setEditStatus(review.status);
  };

  const handleUpdateStatus = async () => {
    if (!editReview) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/admin/reviews/${editReview.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: editStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to update review status.");
        return;
      }

      setReviews((current) =>
        current.map((review) =>
          review.id === editReview.id
            ? {
                ...review,
                status: editStatus,
                isVisible: editStatus === "COMPLETED",
              }
            : review
        )
      );

      setEditReview(null);
      setSuccessOpen(true);
    } catch {
      setError("Unable to update review status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 4, backgroundColor: "#fff", minHeight: "100vh" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontFamily: "var(--font-nunito-sans)",
          }}
        >
          Customer Reviews
        </Typography>

        <IconButton>
          <SettingsIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder="Search reviews..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ width: 280 }}
        />

        <TextField
          select
          size="small"
          label="Filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          sx={{ width: 160 }}
        >
          <MenuItem value="ALL">All</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="COMPLETED">Completed</MenuItem>
          <MenuItem value="REJECTED">Rejected</MenuItem>
          <MenuItem value="HIDDEN">Hidden</MenuItem>
        </TextField>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Review #</TableCell>
              <TableCell>Transaction #</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Barber</TableCell>
              <TableCell>Service/s</TableCell>
              <TableCell>Overall</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : filteredReviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                  No reviews found.
                </TableCell>
              </TableRow>
            ) : (
              filteredReviews.map((review, index) => (
                <TableRow key={review.id} hover>
                  <TableCell>{String(index + 1).padStart(4, "0")}</TableCell>

                  <TableCell>{getTransactionNo(review)}</TableCell>

                  <TableCell>{getTransactionType(review)}</TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    {getCustomerName(review)}
                  </TableCell>

                  <TableCell>{getBarberName(review)}</TableCell>

                  <TableCell>{getServiceName(review)}</TableCell>

                  <TableCell>
                    <Rating value={Number(review.rating)} precision={0.5} readOnly size="small"/>
                  </TableCell>

                  <TableCell>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={review.status}
                      color={getStatusColor(review.status)}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <IconButton size="small" onClick={() => setViewReview(review)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>

                    <IconButton size="small" onClick={() => handleOpenEdit(review)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography sx={{ mt: 2, fontSize: 14 }}>
        Showing 1 to {filteredReviews.length} of {reviews.length} Entries
      </Typography>

      <Dialog
        open={Boolean(viewReview)}
        onClose={() => setViewReview(null)}
        fullWidth
        maxWidth="sm"
      >
        {viewReview && (
          <>
            <DialogTitle
              sx={{
                fontWeight: 800,
                fontFamily: "var(--font-nunito-sans)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              Review #
              {String(
                reviews.findIndex((r) => r.id === viewReview.id) + 1
              ).padStart(4, "0")}

              <IconButton onClick={() => setViewReview(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent>
              <Typography sx={{ mb: 1, fontWeight: 700 }}>
                Transaction #: {getTransactionNo(viewReview)}
              </Typography>

              <Typography sx={{ mb: 1, fontWeight: 700 }}>
                Type: {getTransactionType(viewReview)}
              </Typography>

              <Typography sx={{ mb: 1, fontWeight: 700 }}>
                Customer Name: {getCustomerName(viewReview)}
              </Typography>

              <Typography sx={{ mb: 1, fontWeight: 700 }}>
                Barber: {getBarberName(viewReview)} | Rating:{" "}
                <Rating
                  value={Number(viewReview.rating)}
                  precision={0.5}
                  readOnly
                  size="small"
                />
              </Typography>

              <Typography sx={{ mb: 1, fontWeight: 700 }}>
                Selected Service/s: {getServiceName(viewReview)} | Rating:{" "}
                <Rating
                  value={Number(viewReview.rating)}
                  precision={0.5}
                  readOnly
                  size="small"
                />
              </Typography>

              <Typography sx={{ mb: 1, fontWeight: 700 }}>
                Date of Review:{" "}
                {new Date(viewReview.createdAt).toLocaleDateString()}
              </Typography>

              <Typography sx={{ mb: 1, fontWeight: 700 }}>
                Overall Service Rating:{" "}
                <Rating
                  value={Number(viewReview.rating)}
                  precision={0.5}
                  readOnly
                  size="small"
                  sx={{ verticalAlign: "middle" }}
                />
              </Typography>

              <Typography sx={{ mb: 1, fontWeight: 700 }}>
                Customer Review:
              </Typography>

              <Box
                sx={{
                  border: "1px solid #bbb",
                  borderRadius: 2,
                  minHeight: 160,
                  p: 2,
                  whiteSpace: "pre-wrap",
                  fontSize: 14,
                }}
              >
                {viewReview.comment || "No comment provided."}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      <Dialog
        open={Boolean(editReview)}
        onClose={() => setEditReview(null)}
        fullWidth
        maxWidth="sm"
      >
        {editReview && (
          <>
            <DialogTitle
              sx={{
                fontWeight: 800,
                fontFamily: "var(--font-nunito-sans)",
              }}
            >
              Edit Customer Reviews
            </DialogTitle>

            <DialogContent>
              <Typography sx={{ mb: 2 }}>
                Review #{" "}
                {String(
                  reviews.findIndex((r) => r.id === editReview.id) + 1
                ).padStart(4, "0")}
              </Typography>

              <TextField
                select
                fullWidth
                label="Status"
                value={editStatus}
                onChange={(event) =>
                  setEditStatus(event.target.value as ReviewStatus)
                }
                sx={{ mb: 4 }}
              >
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
                <MenuItem value="HIDDEN">Hidden</MenuItem>
              </TextField>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button
                onClick={() => setEditReview(null)}
                variant="contained"
                sx={{
                  backgroundColor: "#777",
                  color: "#ffc400",
                  textTransform: "none",
                  px: 4,
                  "&:hover": { backgroundColor: "#666" },
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={handleUpdateStatus}
                disabled={saving}
                variant="contained"
                sx={{
                  backgroundColor: "#000",
                  color: "#ffc400",
                  textTransform: "none",
                  px: 4,
                  "&:hover": { backgroundColor: "#111" },
                }}
              >
                {saving ? "Saving..." : "Edit Review Status"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ textAlign: "center", py: 5 }}>
          <CheckCircleIcon
            sx={{
              fontSize: 70,
              color: "success.main",
              mb: 2,
            }}
          />

          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontFamily: "var(--font-nunito-sans)",
              mb: 1,
            }}
          >
            Edit Successful
          </Typography>

          <Typography
            sx={{
              color: "text.secondary",
              fontFamily: "var(--font-nunito-sans)",
              mb: 3,
            }}
          >
            Customer review status has been updated successfully.
          </Typography>

          <Button
            variant="contained"
            onClick={() => setSuccessOpen(false)}
            sx={{
              backgroundColor: "#000",
              color: "#ffc400",
              textTransform: "none",
              px: 4,
              "&:hover": {
                backgroundColor: "#111",
              },
            }}
          >
            OK
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}