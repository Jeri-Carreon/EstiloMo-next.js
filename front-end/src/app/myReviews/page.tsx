'use client';

import { useEffect, useState, FormEvent } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Rating from '@mui/material/Rating';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const availableServices = ['Hot Oil', 'Dapper Bro', 'Haircut', 'Beard Trim'];

type Review = {
  id: string;
  service: string;
  rating: number;
  comment: string;
  createdAt: string;

  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

const ratingLabels: Record<string, string> = {
  '0.5': 'Poor',
  '1': 'Poor',
  '1.5': 'Below average',
  '2': 'Average',
  '2.5': 'Average',
  '3': 'Good',
  '3.5': 'Good',
  '4': 'Excellent',
  '4.5': 'Excellent',
  '5': 'Excellent',
};

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [service, setService] = useState(availableServices[0]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const loadMyReviews = async () => {
      try {
        const res = await fetch('/api/reviews?mine=true');
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            setError('Please sign in to view your reviews.');
          } else {
            setError(data.error || 'Unable to load your reviews.');
          }
          setReviews([]);
          return;
        }

        setError('');
        setReviews(data.reviews || []);
      } catch (e) {
        setError('Unable to load your reviews.');
      }
    };

    loadMyReviews();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!comment.trim()) {
      setError('Please enter a review comment.');
      return;
    }

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, rating, comment: comment.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError('Please sign in to submit a review.');
        } else {
          setError(data.error || 'Unable to submit review.');
        }
        return;
      }

      setReviews((current) => [data.review, ...current]);
      setComment('');
      setSuccess('Review added successfully!');
      setIsDialogOpen(false);
    } catch (e) {
      setError('Unable to submit review.');
    }
  };

  return (
    <>
      <Navbar />
      <Box sx={{ maxWidth: 980, mx: 'auto', px: 2, py: 6 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, fontFamily: 'var(--font-nunito-sans)',textAlign: 'center' }}>
          My Reviews
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Button
            variant="contained"
            onClick={() => setIsDialogOpen(true)}
            sx={{
              fontFamily: 'var(--font-nunito-sans)',
              textTransform: 'none',
              borderRadius: 10,
              px: 4,
              py: 1.5,
              backgroundColor: '#000',
              '&:hover': { backgroundColor: '#222' },
            }}
          >
            Add a review
          </Button>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        {success && (
          <Typography color="success.main" sx={{ mb: 2, textAlign: 'center' }}>
            {success}
          </Typography>
        )}

        {reviews.length === 0 ? (
          <Box
            sx={{
              mb: 4,
              p: 4,
              border: '1px solid #ddd',
              borderRadius: 3,
              backgroundColor: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 220,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-nunito-sans)', mb: 1, fontWeight: 700 }}>
              You don't have any reviews.
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-nunito-sans)', color: 'text.secondary' }}>
              Review one now!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontFamily: 'var(--font-nunito-sans)', mb: 2, fontWeight: 600 }}>Your submitted reviews</Typography>
            {reviews.map((review) => (
              <Box
                key={review.id}
                sx={{
                  border: '1px solid #ddd',
                  borderRadius: 2,
                  p: 2,
                  mb: 2,
                  backgroundColor: '#fff',
                }}
              >
                <Typography sx={{ fontFamily: 'var(--font-nunito-sans)', fontWeight: 700 }}>{review.service}</Typography>
                <Typography sx={{ color: 'text.secondary', fontFamily: 'var(--font-nunito-sans)', mb: 1 }}>
                  Reviewed on {new Date(review.createdAt).toLocaleDateString()}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Rating precision={0.5} value={review.rating} readOnly size="small" />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {ratingLabels[review.rating.toFixed(1)]}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'var(--font-nunito-sans)', mt: 1 }}>{review.comment}</Typography>
              </Box>
            ))}
          </Box>
        )}

        <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ fontFamily: 'var(--font-nunito-sans)', fontWeight: 700 }}>Add a Review</DialogTitle>
          <DialogContent>
            {error && (
              <Typography color="error" sx={{ fontFamily: 'var(--font-nunito-sans)', mb: 2 }}>
                {error}
              </Typography>
            )}
            <Box component="form" onSubmit={handleSubmit}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="service-select-label">Service</InputLabel>
                <Select
                  labelId="service-select-label"
                  value={service}
                  label="Service"
                  onChange={(event) => setService(event.target.value)}
                >
                  {availableServices.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontFamily: 'var(--font-nunito-sans)', minWidth: 90 }}>Rating</Typography>
                  <Rating
                    name="review-rating"
                    precision={0.5}
                    value={rating}
                    onChange={(_, value) => setRating(value ?? rating)}
                  />
                </Box>
                <Typography sx={{ color: 'text.secondary', fontSize: 13, ml: 12 }}>
                  {ratingLabels[rating.toFixed(1)]}
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
                <Button onClick={() => setIsDialogOpen(false)} sx={{ fontFamily: 'var(--font-nunito-sans)', textTransform: 'none' }}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" sx={{ fontFamily: 'var(--font-nunito-sans)', textTransform: 'none' }}>
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
