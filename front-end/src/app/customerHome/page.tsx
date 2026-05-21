'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ChatbotFloatingButton from '@/components/ChatbotFloatingButton';

type Customer = {
  firstName: string;
};

type RecommendedService = {
  id: string;
  name: string;
  price: number;
  image: string;
  reason: string;
};

type Appointment = {
  status: string;
  date: string;
  time: string;
  service: string;
  barber: string;
  totalPrice: number;
};

const nextAppointment: Appointment = {
  status: 'Confirmed',
  date: 'February 25, 2026',
  time: '7:00 PM - 8:00 PM',
  service: 'Signature Haircut',
  barber: 'Dwight Ramos',
  totalPrice: 300,
};

const recommendedServices: RecommendedService[] = [
  {
    id: 'scalp-treatment',
    name: 'Scalp Treatment',
    price: 650,
    image: '/images/scalp-treatment.jpg',
    reason: 'Based on your past service selections.',
  },
  {
    id: 'scalp-massage',
    name: 'Scalp Massage',
    price: 200,
    image: '/images/scalp-massage.jpg',
    reason: 'Based on your past service selections.',
  },
  {
    id: 'shave',
    name: 'Shave',
    price: 150,
    image: '/images/shave.jpg',
    reason: 'Based on your past service selections.',
  },
];

export default function CustomerLandingPage() {
  const [customer, setCustomer] = useState<Customer>({
    firstName: 'Customer',
  });

  const totalPrice = useMemo(() => {
    return nextAppointment.totalPrice.toLocaleString('en-PH');
  }, []);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await fetch('/api/customerHome');
        const data = await res.json();

        if (res.ok) {
          setCustomer(data.customer);
        }
      } catch (error) {
        console.error('Failed to fetch customer:', error);
      }
    };

    fetchCustomer();
  }, []);

  return (
    <Box sx={{ bgcolor: '#fff', minHeight: '100vh' }}>
      <Navbar />

      {/* MAIN CONTENT */}
      <Box sx={{ px: { xs: 2, md: 5 }, py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 500, mb: 1 }}>
          Welcome Back, {customer.firstName}!
        </Typography>

        <Typography sx={{ fontSize: 14, mb: 4 }}>
          Here's your appointment and personalized recommendations.
        </Typography>

        {/* APPOINTMENT CARD */}
        <Card
          elevation={0}
          sx={{
            bgcolor: '#e5e5e5',
            borderRadius: 0,
            p: { xs: 2, md: 3 },
            mb: 4,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography sx={{ fontSize: 16, fontWeight: 500 }}>
              Your Next Appointment
            </Typography>

            <Chip
              label={nextAppointment.status}
              sx={{
                bgcolor: '#000',
                color: '#fff',
                borderRadius: 1,
                fontSize: 12,
                height: 28,
              }}
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-around',
              gap: 3,
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <CalendarMonthIcon />

              <Box>
                <Typography sx={{ fontWeight: 600 }}>Date</Typography>

                <Typography sx={{ fontSize: 14 }}>
                  {nextAppointment.date}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <AccessTimeIcon />

              <Box>
                <Typography sx={{ fontWeight: 600 }}>Time</Typography>

                <Typography sx={{ fontSize: 14 }}>
                  {nextAppointment.time}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#777', mb: 2 }} />

          <Typography sx={{ fontWeight: 500, mb: 1 }}>
            Services Booked
          </Typography>

          <Row
            label={nextAppointment.service}
            value={`₱ ${nextAppointment.totalPrice}`}
          />

          <Typography sx={{ fontWeight: 500, mt: 2, mb: 1 }}>
            Barber Booked
          </Typography>

          <Row label={nextAppointment.barber} />

          <Divider sx={{ borderColor: '#777', my: 2 }} />

          <Row label="Total Price" value={`₱ ${totalPrice}`} bold />
        </Card>

        {/* RECOMMENDED SERVICES */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 1,
            mb: 3,
          }}
        >
          <BookmarkBorderIcon />

          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Recommended For You
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, minmax(280px, 320px))',
            },
            justifyContent: 'space-evenly',
            gap: 4,
            width: '100%',
          }}
        >
          {recommendedServices.map((service) => (
            <Card
              key={service.id}
              elevation={0}
              sx={{
                bgcolor: '#d9d9d9',
                borderRadius: 0,
                p: 2,
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: 170,
                  position: 'relative',
                  mb: 1.5,
                  bgcolor: '#ccc',
                }}
              >
                <Image
                  src={service.image}
                  alt={service.name}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </Box>

              <Typography sx={{ fontWeight: 800, fontSize: 15 }}>
                {service.name} - ₱ {service.price}
              </Typography>

              <Typography sx={{ fontSize: 11, mb: 1.5 }}>
                {service.reason}
              </Typography>

              <Button
                fullWidth
                variant="contained"
                sx={{
                  bgcolor: '#000',
                  color: '#fff',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  py: 0.7,
                  '&:hover': {
                    bgcolor: '#222',
                  },
                }}
              >
                Book Now
              </Button>
            </Card>
          ))}
        </Box>
      </Box>

      <Footer />

      <ChatbotFloatingButton />
    </Box>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value?: string;
  bold?: boolean;
}) {
  return (
    <Box
      sx={{
        bgcolor: '#c8c8c8',
        px: 2,
        py: 1,
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: bold ? 700 : 400,
        fontSize: 14,
      }}
    >
      <span>{label}</span>
      {value && <span>{value}</span>}
    </Box>
  );
}