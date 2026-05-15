'use client';

import { styled } from '@mui/material/styles';
import { Box, Grid, Paper, Typography, Container, Stack, Button } from "@mui/material";
import { useEffect, useState } from 'react';

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
  boxShadow: 'none',
}));

{/*}
const services = [
  {
    title: "Signature Haircut",
    price: "₱300",
    description: "A precision cut tailored to your face shape and style preference. Clean fades, sharp lines, and a polished finish that keeps you looking fresh."
  },
  {
    title: "Kids Haircut",
    price: "₱300",
    description: "A comfortable and stylish haircut designed for younger clients. We keep it quick, clean, and kid-friendly while still delivering a sharp look."
  },
  {
    title: "Shave",
    price: "₱150",
    description: "A smooth, close shave with careful attention to detail. Leaves your skin refreshed, clean, and irritation-free."
  },
  {
    title: "Scalp Massage",
    price: "₱200",
    description: "A relaxing treatment that improves blood circulation and relieves tension. Perfect for unwinding while promoting healthier hair growth."
  },
  {
    title: "Charcoal Mask",
    price: "₱150",
    description: "A deep-cleansing facial treatment that removes dirt, oil, and impurities. Leaves your skin feeling fresh, smooth, and revitalized."
  },
  {
    title: "Scalp Treatment",
    price: "₱650",
    description: "An intensive care service designed to nourish and restore scalp health. Helps reduce dryness, dandruff, and buildup for stronger, healthier hair."
  },
  {
    title: "Hot Oil",
    price: "₱300",
    description: "A conditioning treatment that deeply moisturizes dry or damaged hair. Restores shine, softness, and overall hair strength."
  },
  {
    title: "Shampoo & Blow Dry",
    price: "₱50",
    description: "A thorough cleanse to remove dirt, oil, and product buildup. Leaves your hair fresh, light, and ready for styling."
  },
  {
    title: "Hair Color with Haircut",
    price: "Basic - ₱650 | Premium - ₱850",
    description: "An intensive care service designed to nourish and restore scalp health. Helps reduce dryness, dandruff, and buildup for stronger, healthier hair."
  },
  {
    title: "Hair Color with Bleach",
    price: "Basic - ₱1,400 | Premium - ₱1,600",
    description: "An intensive care service designed to nourish and restore scalp health. Helps reduce dryness, dandruff, and buildup for stronger, healthier hair."
  },  
  {
    title: "Classic Bro",
    price: "₱320",
    description: "A thorough cleanse to remove dirt, oil, and product buildup. Leaves your hair fresh, light, and ready for styling."
  },
  {
    title: "Dapper Bro",
    price: "₱550",
    description: "A thorough cleanse to remove dirt, oil, and product buildup. Leaves your hair fresh, light, and ready for styling."
  },
  {
    title: "The Bro Look",
    price: "₱1,100",
    description: "A thorough cleanse to remove dirt, oil, and product buildup. Leaves your hair fresh, light, and ready for styling."
  },
];
*/}

interface Service {
  id: string;
  name: string;
  price: string;
  description: string;
}

export default function ServicesSection() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadServices = async () => {
    try {
      const res = await fetch('/api/services');

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to load services.');
        setServices([]);
      } else {
        setError('');
        setServices(data.services || []);
      }
    } catch (e) {
      setError('Unable to load services.')
    }

    setLoading(false);
  }

  useEffect(() => {
    loadServices();
  }, []);

  return (
    <Box sx={{ px: 8, py: 6, backgroundColor: "#fdfcfa" }}>
      
      <Typography variant="h3" align="center" gutterBottom sx={{ mb: 4, fontFamily: 'var(--font-nunito-sans)', }}>
        Our Services
      </Typography>

      <Grid container spacing={3}>
        {services.map((service, index) => (
          <Grid size={{ xs: 12, md: 6 }} key={index}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold", fontFamily: 'var(--font-nunito-sans)', }}>
                {service.name} - ₱{service.price}
              </Typography>

              <Typography variant="body2" sx={{ mt: 1, fontFamily: 'var(--font-nunito-sans)', }}>
                - {service.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button variant="contained" color="secondary" size="large" sx={{
                width: {
                xs: '100%', // width on small screens
                sm: '60%',  // width on medium screens
                md: 'auto',  // width on large screens
                },
                p: 3,
                borderRadius: 10,
                fontSize: '1.2rem',
                textTransform: 'none', // to keep the text as it is without uppercase
                '&:hover': {
                        backgroundColor: 'accent.main',
                        },
                fontFamily: 'var(--font-nunito-sans)',
            }}
            href="/appointment"
            >
                Book An Appointment!
            </Button>  
        </Box>
        
    </Box>
  );
}