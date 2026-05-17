'use client';

import { useEffect, useState } from 'react';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

import { Box, Grid, Paper, Typography, Button, Avatar } from '@mui/material';
import Stack from '@mui/material/Stack';

const steps = ['Barber', 'Service', 'Schedule', 'Cart', 'Confirmation'];

interface Barber {
  id: string;
  name: string;
  role?: string;
}

export default function AppointmentPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBarbers = async () => {
    try {
      const res = await fetch('/api/appointment/barbers');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to load barbers.');
        setBarbers([]);
      } else {
        setError('');
        setBarbers(data.barbers || []);
      }
    } catch (e) {
      setError('Unable to load barbers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarbers();
  }, []);

  return (
    <>
      <Navbar />

      <Box sx={{ minHeight: '100vh', backgroundColor: '#000' }}>
        <Box sx={{ display: 'flex' }}>
          {/* SIDEBAR */}
          <Box
            sx={{
              width: 220,
              backgroundColor: '#000',
              borderRight: '1px solid #222',
              px: 3,
              py: 5,
            }}
          >
            <Stack spacing={5}>
              {steps.map((step, index) => {
                const active = index === 0;

                return (
                  <Stack
                    key={step}
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: 'center' }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: active ? '#f4b400' : '#777',
                        color: active ? '#000' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                      }}
                    >
                      {index + 1}
                    </Box>

                    <Typography
                      sx={{
                        color: active ? '#fff' : '#aaa',
                        fontWeight: active ? 'bold' : 'normal',
                        fontFamily: 'var(--font-nunito-sans)',
                      }}
                    >
                      {step}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Box>

          {/* MAIN CONTENT */}
          <Box sx={{ flex: 1, backgroundColor: '#e5e5e5', minHeight: '100vh' }}>
            {/* TITLE */}
            <Box sx={{ borderBottom: '1px solid #bbb', px: 4, py: 3 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-nunito-sans)',
                }}
              >
                Barber
              </Typography>
            </Box>

            {/* BARBERS */}
            <Box sx={{ p: 4 }}>
              {loading ? (
                <Typography>Loading barbers...</Typography>
              ) : error ? (
                <Typography color="error">{error}</Typography>
              ) : (
                <Grid container spacing={4}>
                  {barbers.map((barber) => {
                    const isSelected = selectedBarber === barber.id;

                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 3 }} key={barber.id}>
                        <Paper
                          onClick={() => setSelectedBarber(barber.id)}
                          elevation={0}
                          sx={{
                            p: 4,
                            borderRadius: 4,
                            cursor: 'pointer',
                            border: isSelected
                              ? '3px solid #f4b400'
                              : '1px solid #ddd',
                            transition: '0.2s',

                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: 3,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              mb: 3,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 90,
                                height: 90,
                                backgroundColor: '#e0e0e0',
                                color: '#000',
                                fontSize: '2rem',
                              }}
                            >
                              👤
                            </Avatar>
                          </Box>

                          <Typography
                            align="center"
                            sx={{
                              fontWeight: 'bold',
                              fontSize: '1.1rem',
                              fontFamily: 'var(--font-nunito-sans)',
                            }}
                          >
                            {barber.name}
                          </Typography>

                          <Typography
                            align="center"
                            sx={{
                              color: '#666',
                              mt: 1,
                              fontFamily: 'var(--font-nunito-sans)',
                            }}
                          >
                            {'Barber'}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>

            {/* FOOTER BUTTONS */}
            <Box
              sx={{
                borderTop: '1px solid #bbb',
                px: 4,
                py: 3,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#cfcfcf',
                  color: '#666',
                  px: 6,
                  py: 1.5,
                  borderRadius: 10,
                  textTransform: 'none',
                  boxShadow: 'none',
                }}
              >
                Back
              </Button>

              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#f4b400',
                  color: '#000',
                  px: 6,
                  py: 1.5,
                  borderRadius: 10,
                  textTransform: 'none',
                  fontWeight: 'bold',
                  boxShadow: 'none',
                }}
              >
                Next
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Footer />
    </>
  );
}