"use client";

import { useEffect, useState, FormEvent } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Rating from "@mui/material/Rating";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type ReviewableItem = {
  id: string;
  sourceType: "BOOKING" | "WALKIN";
  appointmentId: string | null;
  saleId: string | null;
  appointmentCode: string;
  appointmentDate: string;
  service: {
    name: string;
  };
  barber: {
    firstName: string;
    lastName: string;
  };
};

type Review = {
  id: string;
  service: string;
  rating: number;
  comment: string | null;
  isAnonymous?: boolean;
  status: "PENDING" | "COMPLETED" | "REJECTED" | "HIDDEN";
  isVisible: boolean;
  createdAt: string;
  appointment?: {
    appointmentCode: string;
    appointmentDate: string;
    service: {
      name: string;
    };
    barber: {
      firstName: string;
      lastName: string;
    };
  };
  sale?: {
    saleCode: string;
    createdAt: string;
    barber?: {
      firstName: string;
      lastName: string;
    } | null;
    items?: {
      service?: {
        name: string;
      };
    }[];
  };
};

const ratingLabels: Record<string, string> = {
  "0.5": "Poor",
  "1.0": "Poor",
  "1.5": "Below average",
  "2.0": "Average",
  "2.5": "Average",
  "3.0": "Good",
  "3.5": "Good",
  "4.0": "Excellent",
  "4.5": "Excellent",
  "5.0": "Excellent",
};

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewables, setReviewables] = useState<ReviewableItem[]>([]);

  const [selectedReviewableId, setSelectedReviewableId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadMyReviews = async () => {
    try {
      const res = await fetch("/api/reviews?mine=true", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          res.status === 401
            ? "Please sign in to view your reviews."
            : data.error || "Unable to load your reviews."
        );
        setReviews([]);
        return;
      }

      setReviews(data.reviews || []);
    } catch {
      setError("Unable to load your reviews.");
    }
  };

  const loadReviewables = async () => {
    try {
      const res = await fetch("/api/reviews?completedAppointments=true", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setReviewables([]);
        return;
      }

      setReviewables(data.appointments || []);
    } catch {
      setReviewables([]);
    }
  };

  useEffect(() => {
    loadMyReviews();
    loadReviewables();
  }, []);

  const handleOpenDialog = () => {
    setError("");
    setComment("");
    setRating(5);
    setIsAnonymous(false);
    setSelectedReviewableId(reviewables[0]?.id || "");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    const selectedItem = reviewables.find(
      (item) => item.id === selectedReviewableId
    );

    if (!selectedItem) {
      setError("Please select a completed appointment or paid sale.");
      return;
    }

    if (!comment.trim()) {
      setError("Please enter a review comment.");
      return;
    }

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceType: selectedItem.sourceType,
          appointmentId: selectedItem.appointmentId,
          saleId: selectedItem.saleId,
          rating,
          comment: comment.trim(),
          isAnonymous,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          res.status === 401
            ? "Please sign in to submit a review."
            : data.error || "Unable to submit review."
        );
        return;
      }

      setReviews((current) => [data.review, ...current]);
      setReviewables((current) =>
        current.filter((item) => item.id !== selectedReviewableId)
      );

      setComment("");
      setSelectedReviewableId("");
      setRating(5);
      setIsAnonymous(false);
      setIsDialogOpen(false);
    } catch {
      setError("Unable to submit review.");
    }
  };

  return (
    <>
      <Navbar />

      <Box sx={{ maxWidth: 980, mx: "auto", px: 2, py: 6 }}>
        <Typography
          variant="h4"
          sx={{
            mb: 3,
            fontWeight: 700,
            fontFamily: "var(--font-nunito-sans)",
            textAlign: "center",
          }}
        >
          My Reviews
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <Button
            variant="contained"
            onClick={handleOpenDialog}
            disabled={reviewables.length === 0}
            sx={{
              fontFamily: "var(--font-nunito-sans)",
              textTransform: "none",
              borderRadius: 10,
              px: 4,
              py: 1.5,
              backgroundColor: "#000",
              "&:hover": { backgroundColor: "#222" },
              "&.Mui-disabled": {
                backgroundColor: "#999",
                color: "#fff",
              },
            }}
          >
            Add a review
          </Button>
        </Box>

        {reviewables.length === 0 && (
          <Typography
            sx={{
              mb: 3,
              textAlign: "center",
              color: "text.secondary",
              fontFamily: "var(--font-nunito-sans)",
            }}
          >
            You can only review completed appointments or paid sales that have
            not been reviewed yet.
          </Typography>
        )}

        {error && (
          <Typography color="error" sx={{ mb: 2, textAlign: "center" }}>
            {error}
          </Typography>
        )}

        {reviews.length === 0 ? (
          <Box
            sx={{
              mb: 4,
              p: 4,
              border: "1px solid #ddd",
              borderRadius: 3,
              backgroundColor: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 220,
              textAlign: "center",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontFamily: "var(--font-nunito-sans)",
                mb: 1,
                fontWeight: 700,
              }}
            >
              You don't have any reviews.
            </Typography>

            <Typography
              sx={{
                fontFamily: "var(--font-nunito-sans)",
                color: "text.secondary",
              }}
            >
              Complete an appointment or paid transaction first before reviewing.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mb: 4 }}>
            <Typography
              sx={{
                fontFamily: "var(--font-nunito-sans)",
                mb: 2,
                fontWeight: 600,
              }}
            >
              Your submitted reviews
            </Typography>

            {reviews.map((review) => {
              const serviceName =
                review.appointment?.service?.name ||
                review.sale?.items
                  ?.map((item) => item.service?.name)
                  .filter(Boolean)
                  .join(", ") ||
                review.service;

              const barberName = review.appointment?.barber
                ? `${review.appointment.barber.firstName} ${review.appointment.barber.lastName}`
                : review.sale?.barber
                ? `${review.sale.barber.firstName} ${review.sale.barber.lastName}`
                : "N/A";

              return (
                <Box
                  key={review.id}
                  sx={{
                    border: "1px solid #ddd",
                    borderRadius: 2,
                    p: 2,
                    mb: 2,
                    backgroundColor: "#fff",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: "var(--font-nunito-sans)",
                      fontWeight: 700,
                      mb: 0.5,
                    }}
                  >
                    {serviceName}
                  </Typography>

                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontFamily: "var(--font-nunito-sans)",
                      mb: 0.5,
                    }}
                  >
                    Barber: {barberName}
                  </Typography>

                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontFamily: "var(--font-nunito-sans)",
                      mb: 0.5,
                    }}
                  >
                    Display name: {review.isAnonymous ? "Anonymous" : "Your name"}
                  </Typography>

                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontFamily: "var(--font-nunito-sans)",
                      mb: 1,
                    }}
                  >
                    Reviewed on {new Date(review.createdAt).toLocaleDateString()}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Rating
                      precision={0.5}
                      value={review.rating}
                      readOnly
                      size="small"
                    />

                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {ratingLabels[Number(review.rating).toFixed(1)]}
                    </Typography>
                  </Box>

                  <Typography sx={{ fontFamily: "var(--font-nunito-sans)", mt: 1 }}>
                    {review.comment || "No comment provided."}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}

        <Dialog
          open={isDialogOpen}
          onClose={handleCloseDialog}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle
            sx={{
              fontFamily: "var(--font-nunito-sans)",
              fontWeight: 700,
            }}
          >
            Add a Review
          </DialogTitle>

          <DialogContent>
            {error && (
              <Typography
                color="error"
                sx={{
                  fontFamily: "var(--font-nunito-sans)",
                  mb: 2,
                }}
              >
                {error}
              </Typography>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
                <InputLabel id="reviewable-select-label">
                  Completed Appointment / Paid Sale
                </InputLabel>

                <Select
                  labelId="reviewable-select-label"
                  value={selectedReviewableId}
                  label="Completed Appointment / Paid Sale"
                  onChange={(event) =>
                    setSelectedReviewableId(event.target.value)
                  }
                >
                  {reviewables.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.appointmentCode} - {item.service.name} with{" "}
                      {item.barber.firstName} {item.barber.lastName} -{" "}
                      {new Date(item.appointmentDate).toLocaleDateString()}{" "}
                      ({item.sourceType === "WALKIN" ? "Walk-in" : "Appointment"})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography
                    sx={{
                      fontFamily: "var(--font-nunito-sans)",
                      minWidth: 90,
                    }}
                  >
                    Rating
                  </Typography>

                  <Rating
                    name="review-rating"
                    precision={0.5}
                    value={rating}
                    onChange={(_, value) => setRating(value ?? rating)}
                  />
                </Box>

                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: 13,
                    ml: 12,
                  }}
                >
                  {ratingLabels[Number(rating).toFixed(1)]}
                </Typography>
              </Box>

              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Review comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                sx={{ mb: 1 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={isAnonymous}
                    onChange={(event) => setIsAnonymous(event.target.checked)}
                  />
                }
                label="Post as anonymous"
                sx={{ mb: 2 }}
              />

              <DialogActions sx={{ px: 0, pb: 0, pt: 0 }}>
                <Button
                  onClick={handleCloseDialog}
                  sx={{
                    fontFamily: "var(--font-nunito-sans)",
                    textTransform: "none",
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    fontFamily: "var(--font-nunito-sans)",
                    textTransform: "none",
                    backgroundColor: "#000",
                  }}
                >
                  Submit Review
                </Button>
              </DialogActions>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>

      <Footer />
    </>
  );
}