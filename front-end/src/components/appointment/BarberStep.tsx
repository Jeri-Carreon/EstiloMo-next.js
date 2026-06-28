'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';

import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import type { AppointmentData } from '@/app/appointment/page';

const steps = ['Barber', 'Service', 'Schedule', 'Cart', 'Confirmation'];

interface Barber {
  id: string;
  name: string;
  role?: string;
}

interface BarberStepProps {
  appointmentData: AppointmentData;
  setAppointmentData: React.Dispatch<React.SetStateAction<AppointmentData>>;
  nextStep: (
    appointmentDate?: string,
    startMinutes?: number,
    endMinutes?: number
  ) => void;
  cartCount: number;
  onCartClick: () => void;
}

export default function BarberStep({
  appointmentData,
  setAppointmentData,
  nextStep,
  cartCount,
  onCartClick,
}: BarberStepProps) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>(
    appointmentData.barberId || ''
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBarbers = async () => {
    try {
      const res = await fetch('/api/appointment/barbers');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to load barbers.');
        setBarbers([]);
        return;
      }

      setError('');
      setBarbers(data.barbers || []);
    } catch {
      setError('Unable to load barbers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarbers();
  }, []);

  const handleNext = () => {
    if (!selectedBarber) return;

    const barber = barbers.find((b) => b.id === selectedBarber);
    if (!barber) return;

    setAppointmentData((prev) => ({
      ...prev,
      barberId: barber.id,
      barberName: barber.name,
    }));

    nextStep();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        fontFamily: 'var(--font-nunito-sans)',
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          width: { xs: '100%', md: 220 },
          backgroundColor: '#000',
          borderRight: { xs: 'none', md: '3px solid #0b9cff' },
          borderBottom: { xs: '3px solid #0b9cff', md: 'none' },
          px: { xs: 1.5, md: 2 },
          py: { xs: 1.5, md: 4 },
          minHeight: { xs: 'auto', md: '100vh' },
        }}
      >
        <Stack
          direction={{ xs: 'row', md: 'column' }}
          spacing={{ xs: 1, md: 4 }}
          sx={{ width: '100%' }}
        >
          {steps.map((step, index) => {
            const active = index === 0;

            return (
              <Stack
                key={step}
                direction={{ xs: 'column', md: 'row' }}
                spacing={{ xs: 0.5, md: 2 }}
                sx={{
                  alignItems: 'center',
                  flex: { xs: 1, md: 'initial' },
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    width: { xs: 28, md: 34 },
                    height: { xs: 28, md: 34 },
                    flexShrink: 0,
                    borderRadius: '50%',
                    backgroundColor: active ? '#f4b400' : '#777',
                    color: active ? '#000' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: { xs: 12, md: 14 },
                  }}
                >
                  {index + 1}
                </Box>

                <Typography
                  sx={{
                    color: active ? '#fff' : '#999',
                    fontWeight: active ? 900 : 800,
                    fontSize: { xs: 10, sm: 12, md: 18 },
                    lineHeight: 1.1,
                    textAlign: 'center',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {step}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          backgroundColor: '#d9d9d9',
          minHeight: { xs: 'auto', md: '100vh' },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            borderBottom: '1px solid #aaa',
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            sx={{ fontWeight: 900, fontSize: { xs: 28, sm: 34 }, color: '#111' }}
          >
            Barber
          </Typography>

          <IconButton
            onClick={onCartClick}
            disabled={cartCount === 0}
            sx={{
              bgcolor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '50%',
              width: 48,
              height: 48,
              flexShrink: 0,
              '&:hover': {
                bgcolor: '#f5f5f5',
              },
              '&.Mui-disabled': {
                bgcolor: '#ddd',
                color: '#999',
              },
            }}
          >
            <Badge
              badgeContent={cartCount}
              color="error"
              overlap="circular"
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              sx={{
                '& .MuiBadge-badge': {
                  fontWeight: 900,
                  fontSize: 11,
                  minWidth: 18,
                  height: 18,
                },
              }}
            >
              <ShoppingCartIcon
                sx={{
                  fontSize: 28,
                  color: cartCount === 0 ? '#999' : '#111',
                }}
              />
            </Badge>
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, minWidth: 0 }}>
          {loading ? (
            <Typography>Loading barbers...</Typography>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : (
            <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
              {barbers.map((barber) => {
                const isSelected = selectedBarber === barber.id;

                return (
                  <Grid
                    key={barber.id}
                    size={{
                      xs: 12,
                      sm: 6,
                      md: 3,
                    }}
                  >
                    <Paper
                      onClick={() => setSelectedBarber(barber.id)}
                      elevation={0}
                      sx={{
                        p: { xs: 2.5, sm: 4 },
                        borderRadius: { xs: 2, sm: 4 },
                        cursor: 'pointer',
                        backgroundColor: '#fff',
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
                            maxWidth: '28vw',
                            maxHeight: '28vw',
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
                          fontWeight: 900,
                          fontSize: '1.1rem',
                          color: '#111',
                        }}
                      >
                        {barber.name}
                      </Typography>

                      <Typography
                        align="center"
                        sx={{
                          color: '#666',
                          mt: 1,
                        }}
                      >
                        Barber
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>

        <Box
          sx={{
            borderTop: '1px solid #aaa',
            backgroundColor: '#f5f5f5',
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Button
            disabled
            sx={{
              backgroundColor: '#d3d3d3',
              color: '#111',
              flex: { xs: 1, sm: 'initial' },
              px: { xs: 2, sm: 6 },
              py: 1,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 900,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              '&.Mui-disabled': {
                backgroundColor: '#d3d3d3',
                color: '#999',
              },
            }}
          >
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!selectedBarber}
            sx={{
              backgroundColor: '#f4b400',
              color: '#111',
              flex: { xs: 1, sm: 'initial' },
              px: { xs: 2, sm: 7 },
              py: 1,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 900,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              '&:hover': { backgroundColor: '#e0a800' },
              '&:disabled': {
                backgroundColor: '#f5dc90',
                color: '#777',
              },
            }}
          >
            Next
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
