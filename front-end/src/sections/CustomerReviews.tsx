import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';

const reviews = [
  {
    name: 'Alex Arenas',
    rating: 5,
    date: 'February 20, 2026',
    barber: 'Chris Newsome',
    service: 'Hot Oil',
    comment:
      'Had a great hot oil service with Chris. He was professional, gentle, and made the whole experience relaxing. The treatment left my hair feeling softer and healthier, and the scalp massage was a big plus. Definitely a 5-star service—I’ll be coming back for sure.',
  },
  {
    name: 'Jeri Carreon',
    rating: 5,
    date: 'December 27, 2025',
    barber: 'Rico Blanco',
    service: 'Dapper Bro',
    comment:
      'Tried the Dapper Bro package with Rico and it was worth it. The haircut was clean, shave was smooth, and the charcoal mask felt refreshing. He took his time and made sure everything looked polished. Left feeling fresh and confident. Solid 5-star service.',
  },
];

export default function ReviewsPage() {
  return (
    <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', py: 5 }}>
      
      {/* Header */}
      <Typography
        variant="h4"
        align="center"
        fontWeight="bold"
        mb={10}
      >
        Customer Reviews
      </Typography>

      {/* Reviews Container */}
      <Box
        sx={{
          maxWidth: 750,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          mb: 50,
        }}
      >
        {reviews.map((review, index) => (
          <Box
            key={index}
            sx={{
              backgroundColor: '#fff',
              border: '1px solid #999',
              borderRadius: 1,
              p: 2.5,
              boxShadow: 1,
            }}
          >
            {/* Name + Avatar */}
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
              <Avatar sx={{ width: 32, height: 32 }}>
                {review.name[0]}
              </Avatar>
              <Typography fontWeight="bold">{review.name}</Typography>
            </Stack>

            {/* Rating */}
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
              <Typography fontWeight="medium">Rating:</Typography>
              <Rating value={review.rating} readOnly size="small" />
            </Stack>

            {/* Meta */}
            <Typography variant="body2" color="text.secondary">
              Reviewed on {review.date}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Barber: {review.barber} | Service: {review.service}
            </Typography>

            {/* Comment */}
            <Typography variant="body2" lineHeight={1.5}>
              {review.comment}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}