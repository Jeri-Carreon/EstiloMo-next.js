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

      <Grid container spacing={3} sx={{alignItems:'stretch'}}>
        {services.map((service, index) => (
          <Grid size={{ xs: 12, md: 6 }} key={index}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                borderRadius: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
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