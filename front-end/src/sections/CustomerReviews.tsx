"use client";

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

interface Review {
  id: string;
  service: string;
  rating: number;
  comment: string;
  createdAt: string;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const res = await fetch('/api/reviews');
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Unable to load reviews.');
          setReviews([]);
        } else {
          setError('');
          setReviews(data.reviews || []);
          setFilteredReviews(data.reviews || []);
        }
      } catch (e) {
        setError('Unable to load reviews.');
      }

      setLoading(false);
    };

    loadReviews();
  }, []);

  // 🔎 SEARCH + FILTER LOGIC
  useEffect(() => {
    let temp = [...reviews];

    // search filter
    if (search.trim()) {
      const s = search.toLowerCase();

      temp = temp.filter((review) => {
        const reviewer =
          [review.user?.firstName, review.user?.lastName]
            .filter(Boolean)
            .join(' ') ||
          review.user?.email ||
          '';

        return (
          reviewer.toLowerCase().includes(s) ||
          review.comment.toLowerCase().includes(s) ||
          review.service.toLowerCase().includes(s)
        );
      });
    }

    // rating filter
    if (ratingFilter !== 'all') {
      const ratingValue = Number(ratingFilter);
      temp = temp.filter((r) => r.rating === ratingValue);
    }

    setFilteredReviews(temp);
  }, [search, ratingFilter, reviews]);

  const getRatingLabel = (rating: number) => {
    if (rating <= 1) return 'Poor';
    if (rating <= 2) return 'Average';
    if (rating <= 3) return 'Good';
    if (rating <= 4) return 'Very Good';
    return 'Excellent';
  };

  return (
    <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', py: 6 }}>
      
      <Typography
        variant="h4"
        align="center"
        sx={{ fontWeight: 800, mb: 5, fontFamily: 'var(--font-nunito-sans)', }}
      >
        Customer Reviews
      </Typography>

      {/* SEARCH + FILTER UI */}
      <Box
        sx={{
          maxWidth: 750,
          mx: 'auto',
          mb: 4,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
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
          onChange={(e) => setRatingFilter(e.target.value)}
          sx={{ minWidth: 180, fontFamily: 'var(--font-nunito-sans)', }}
        >
          <MenuItem value="all">All Ratings</MenuItem>
          <MenuItem value="5">5 - Excellent</MenuItem>
          <MenuItem value="4">4 - Very Good</MenuItem>
          <MenuItem value="3">3 - Good</MenuItem>
          <MenuItem value="2">2 - Average</MenuItem>
          <MenuItem value="1">1 - Poor</MenuItem>
        </TextField>
      </Box>

      <Box
        sx={{
          maxWidth: 750,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {loading ? (
          <Typography align="center" sx={{ fontSize: 18, fontFamily: 'var(--font-nunito-sans)', }}>
            Loading reviews...
          </Typography>
        ) : error ? (
          <Typography align="center" color="error" sx={{ fontSize: 18, fontFamily: 'var(--font-nunito-sans)', }}>
            {error}
          </Typography>
        ) : filteredReviews.length === 0 ? (
          <Typography align="center" sx={{ fontSize: 18, fontFamily: 'var(--font-nunito-sans)', }}>
            No reviews found.
          </Typography>
        ) : (
          filteredReviews.map((review) => {
            const reviewer =
              [review.user?.firstName, review.user?.lastName]
                .filter(Boolean)
                .join(' ') ||
              review.user?.email ||
              'Customer';

            return (
              <Box
                key={review.id}
                sx={{
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: 2,
                  p: 3,
                  boxShadow: 2,
                }}
              >
                {/* NAME */}
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ width: 40, height: 40 }}>
                    {reviewer.charAt(0).toUpperCase()}
                  </Avatar>

                  <Typography sx={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-nunito-sans)', }}>
                    {reviewer}
                  </Typography>
                </Stack>

                {/* RATING */}
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 17, fontFamily: 'var(--font-nunito-sans)', }}>
                    Rating:
                  </Typography>

                  <Rating value={review.rating} readOnly size="medium" />

                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: 15,
                      fontFamily: 'var(--font-nunito-sans)',
                      color:
                        review.rating <= 2
                          ? 'error.main'
                          : review.rating <= 3
                          ? 'warning.main'
                          : 'success.main',
                      ml: 1,
                    }}
                  >
                    {getRatingLabel(review.rating)}
                  </Typography>
                </Stack>

                {/* META */}
                <Typography sx={{ fontSize: 14, fontFamily: 'var(--font-nunito-sans)',color: 'text.secondary' }}>
                  Reviewed on {new Date(review.createdAt).toLocaleDateString()}
                </Typography>

                <Typography sx={{ fontSize: 14, fontFamily: 'var(--font-nunito-sans)', color: 'text.secondary', mb: 2 }}>
                  Service: {review.service}
                </Typography>

                {/* COMMENT */}
                <Typography sx={{ fontSize: 16, fontFamily: 'var(--font-nunito-sans)', lineHeight: 1.7 }}>
                  {review.comment}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}