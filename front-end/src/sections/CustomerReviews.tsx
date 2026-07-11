"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Rating from "@mui/material/Rating";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

interface Review {
  id: string;
  service: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  isAnonymous?: boolean;

  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };

  appointment?: {
    service?: {
      name: string;
    };
    barber?: {
      firstName: string;
      lastName: string;
    };
  };

  sale?: {
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
}

type ReviewAverage = {
  averageRating: number;
  reviewCount: number;
};

type RatingFilter = "all" | 1 | 2 | 3 | 4 | 5;

function wholeStarRating(value: number) {
  return Math.min(Math.max(Math.round(Number(value) || 0), 1), 5);
}

export default function CustomerReviews() {
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");

  const {
    data: reviews = [],
    isLoading: loading,
    error,
  } = useQuery<Review[]>({
    queryKey: ["publicCustomerReviews"],
    queryFn: async () => {
      const res = await fetch("/api/reviews", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to load reviews.");
      }

      return data.reviews || [];
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  const { data: reviewAverage = { averageRating: 0, reviewCount: 0 } } =
    useQuery<ReviewAverage>({
      queryKey: ["publicCustomerReviewAverage"],
      queryFn: async () => {
        const res = await fetch("/api/reviews?average=true", {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Unable to load review average.");
        }

        return {
          averageRating: Number(data.averageRating || 0),
          reviewCount: Number(data.reviewCount || 0),
        };
      },
      refetchInterval: 5000,
      refetchOnWindowFocus: false,
    });

  const filteredReviews = useMemo(() => {
    let temp = [...reviews];

    if (search.trim()) {
      const s = search.toLowerCase();

      temp = temp.filter((review) => {
        const reviewer =
          [review.user?.firstName, review.user?.lastName]
            .filter(Boolean)
            .join(" ") ||
          review.user?.email ||
          "";

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
          : "";

        return (
          reviewer.toLowerCase().includes(s) ||
          (review.comment || "").toLowerCase().includes(s) ||
          serviceName.toLowerCase().includes(s) ||
          barberName.toLowerCase().includes(s)
        );
      });
    }

    if (ratingFilter !== "all") {
      temp = temp.filter(
        (review) => Number(review.rating) === ratingFilter
      );
    }

    return temp;
  }, [search, ratingFilter, reviews]);

  const getRatingLabel = (rating: number) => {
    switch (wholeStarRating(rating)) {
      case 5:
        return "Excellent";
      case 4:
        return "Very Good";
      case 3:
        return "Good";
      case 2:
        return "Average";
      case 1:
        return "Poor";
      default:
        return "";
    }
  };

  return (
    <Box sx={{ backgroundColor: "#f5f5f5", minHeight: "100vh", py: 6 }}>
      <Typography
        variant="h4"
        align="center"
        sx={{
          fontWeight: 800,
          mb: 5,
          fontFamily: "var(--font-nunito-sans)",
        }}
      >
        Customer Reviews
      </Typography>

      <Box
        sx={{
          maxWidth: 750,
          mx: "auto",
          mb: 3,
          px: 2,
        }}
      >
        <Box
          sx={{
            bgcolor: "#fff",
            border: "1px solid #d8d8d8",
            borderRadius: 2,
            px: { xs: 2, sm: 3 },
            py: 2,
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 18,
                fontFamily: "var(--font-nunito-sans)",
              }}
            >
              Average Reviews of The Barbs Bro
            </Typography>

            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 14,
                fontFamily: "var(--font-nunito-sans)",
              }}
            >
              Based on customer review
              {reviewAverage.reviewCount === 1 ? "" : "s"}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Rating
              value={
                reviewAverage.reviewCount > 0
                  ? Math.min(Math.max(reviewAverage.averageRating, 0), 5)
                  : 0
              }
              precision={0.1}
              readOnly
              size="medium"
            />

            <Typography
              sx={{
                fontWeight: 900,
                fontSize: 18,
                fontFamily: "var(--font-nunito-sans)",
              }}
            >
              {reviewAverage.reviewCount > 0
                ? reviewAverage.averageRating.toFixed(1)
                : "0.0"}
            </Typography>
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: 750,
          mx: "auto",
          mb: 4,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          px: 2,
        }}
      >
        <TextField
          fullWidth
          label="Search reviews..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <TextField
          select
          label="Filter by rating"
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
          sx={{
            minWidth: 180,
            fontFamily: "var(--font-nunito-sans)",
          }}
        >
          <MenuItem value="all">All Ratings</MenuItem>
          <MenuItem value={5}>5 Stars</MenuItem>
          <MenuItem value={4}>4 Stars</MenuItem>
          <MenuItem value={3}>3 Stars</MenuItem>
          <MenuItem value={2}>2 Stars</MenuItem>
          <MenuItem value={1}>1 Star</MenuItem>
        </TextField>
      </Box>

      <Box
        sx={{
          maxWidth: 750,
          mx: "auto",
          px: 2,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {loading ? (
          <Typography
            align="center"
            sx={{
              fontSize: 18,
              fontFamily: "var(--font-nunito-sans)",
            }}
          >
            Loading reviews...
          </Typography>
        ) : error ? (
          <Typography
            align="center"
            color="error"
            sx={{
              fontSize: 18,
              fontFamily: "var(--font-nunito-sans)",
            }}
          >
            {error instanceof Error ? error.message : "Unable to load reviews."}
          </Typography>
        ) : filteredReviews.length === 0 ? (
          <Typography
            align="center"
            sx={{
              fontSize: 18,
              fontFamily: "var(--font-nunito-sans)",
            }}
          >
            No reviews found.
          </Typography>
        ) : (
          filteredReviews.map((review) => {
            const reviewer = review.isAnonymous
            ? "Anonymous"
            : [review.user?.firstName, review.user?.lastName]
                .filter(Boolean)
                .join(" ") ||
              review.user?.email ||
              "Customer";

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
              : "";

            return (
              <Box
                key={review.id}
                sx={{
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: 2,
                  p: 3,
                  boxShadow: 2,
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center", mb: 2 }}
                >
                  <Avatar sx={{ width: 40, height: 40 }}>
                    {(review.isAnonymous ? "A" : reviewer.charAt(0)).toUpperCase()}
                  </Avatar>

                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: 18,
                      fontFamily: "var(--font-nunito-sans)",
                    }}
                  >
                    {reviewer}
                  </Typography>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", mb: 1 }}
                >
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: 17,
                      fontFamily: "var(--font-nunito-sans)",
                    }}
                  >
                    Rating:
                  </Typography>

                  <Rating
                    value={wholeStarRating(Number(review.rating))}
                    readOnly
                    size="medium"
                  />

                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: 15,
                      fontFamily: "var(--font-nunito-sans)",
                      color:
                        wholeStarRating(Number(review.rating)) <= 2
                          ? "error.main"
                          : wholeStarRating(Number(review.rating)) <= 3
                            ? "warning.main"
                            : "success.main",
                      ml: 1,
                    }}
                  >
                    {getRatingLabel(Number(review.rating))}
                  </Typography>
                </Stack>

                <Typography
                  sx={{
                    fontSize: 14,
                    fontFamily: "var(--font-nunito-sans)",
                    color: "text.secondary",
                  }}
                >
                  Reviewed on {new Date(review.createdAt).toLocaleDateString()}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 14,
                    fontFamily: "var(--font-nunito-sans)",
                    color: "text.secondary",
                  }}
                >
                  Service: {serviceName}
                </Typography>

                {barberName && (
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontFamily: "var(--font-nunito-sans)",
                      color: "text.secondary",
                      mb: 2,
                    }}
                  >
                    Barber: {barberName}
                  </Typography>
                )}

                <Typography
                  sx={{
                    fontSize: 16,
                    fontFamily: "var(--font-nunito-sans)",
                    lineHeight: 1.7,
                    mt: 2,
                  }}
                >
                  {review.comment || "No comment provided."}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
