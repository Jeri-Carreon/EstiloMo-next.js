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
import Chip from "@mui/material/Chip";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Appointment = {
  id: string;
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [appointmentId, setAppointmentId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  const loadCompletedAppointments = async () => {
    try {
      const res = await fetch("/api/reviews?completedAppointments=true", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setAppointments([]);
        return;
      }

      setAppointments(data.appointments || []);
    } catch {
      setAppointments([]);
    }
  };

  useEffect(() => {
    loadMyReviews();
    loadCompletedAppointments();
  }, []);

  const handleOpenDialog = () => {
    setError("");
    setSuccess("");
    setComment("");
    setRating(5);
    setAppointmentId(appointments[0]?.id || "");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!appointmentId) {
      setError("Please select a completed appointment.");
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
          appointmentId,
          rating,
          comment: comment.trim(),
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
      setAppointments((current) =>
        current.filter((appointment) => appointment.id !== appointmentId)
      );

      setComment("");
      setAppointmentId("");
      setRating(5);
      setSuccess("Review submitted successfully. Waiting for admin approval.");
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
            disabled={appointments.length === 0}
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

        {appointments.length === 0 && (
          <Typography
            sx={{
              mb: 3,
              textAlign: "center",
              color: "text.secondary",
              fontFamily: "var(--font-nunito-sans)",
            }}
          >
            You can only review completed appointments that have not been
            reviewed yet.
          </Typography>
        )}

        {error && (
          <Typography color="error" sx={{ mb: 2, textAlign: "center" }}>
            {error}
          </Typography>
        )}

        {success && (
          <Typography color="success.main" sx={{ mb: 2, textAlign: "center" }}>
            {success}
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
              Complete an appointment first before reviewing.
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
                review.appointment?.service?.name || review.service;
              const barberName = review.appointment?.barber
                ? `${review.appointment.barber.firstName} ${review.appointment.barber.lastName}`
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
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                      mb: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: "var(--font-nunito-sans)",
                        fontWeight: 700,
                      }}
                    >
                      {serviceName}
                    </Typography>

                    <Chip
                      size="small"
                      label={review.status}
                      color={
                        review.status === "COMPLETED"
                          ? "success"
                          : review.status === "REJECTED" ||
                              review.status === "HIDDEN"
                            ? "error"
                            : "warning"
                      }
                    />
                  </Box>

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
                      mb: 1,
                    }}
                  >
                    Reviewed on{" "}
                    {new Date(review.createdAt).toLocaleDateString()}
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

                  <Typography
                    sx={{
                      fontFamily: "var(--font-nunito-sans)",
                      mt: 1,
                    }}
                  >
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
                <InputLabel id="appointment-select-label">
                  Completed Appointment
                </InputLabel>

                <Select
                  labelId="appointment-select-label"
                  value={appointmentId}
                  label="Completed Appointment"
                  onChange={(event) => setAppointmentId(event.target.value)}
                >
                  {appointments.map((appointment) => (
                    <MenuItem key={appointment.id} value={appointment.id}>
                      {appointment.appointmentCode} - {appointment.service.name}{" "}
                      with {appointment.barber.firstName}{" "}
                      {appointment.barber.lastName} -{" "}
                      {new Date(
                        appointment.appointmentDate
                      ).toLocaleDateString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  mb: 2,
                }}
              >
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