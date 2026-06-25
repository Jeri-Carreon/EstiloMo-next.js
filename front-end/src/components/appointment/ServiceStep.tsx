'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';

import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import type { AppointmentData } from '@/app/appointment/page';

const steps = ['Barber', 'Service', 'Schedule', 'Cart', 'Confirmation'];

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
  durationMinutes: number;
}

interface ServiceStepProps {
  appointmentData: AppointmentData;
  setAppointmentData: React.Dispatch<React.SetStateAction<AppointmentData>>;
  nextStep: (
    appointmentDate?: string,
    startMinutes?: number,
    endMinutes?: number
  ) => void;
  prevStep: () => void;
  cartCount: number;
  onCartClick: () => void;
}

export default function ServiceStep({
  appointmentData,
  setAppointmentData,
  nextStep,
  prevStep,
  cartCount,
  onCartClick,
}: ServiceStepProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>(
    appointmentData.serviceId || ''
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadServices = async () => {
    try {
      const res = await fetch(
        `/api/appointment/services?barberId=${appointmentData.barberId}`,
        {
          cache: 'no-store',
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to load services.');
        setServices([]);
        return;
      }

      setError('');

      setServices(
        (data.services || []).map((service: any) => ({
          id: service.id,
          name: service.name,
          price: Number(service.price || 0),
          description: service.description || '',
          durationMinutes: Number(service.durationMinutes || 0),
        }))
      );
    } catch (error) {
      console.error('LOAD SERVICES ERROR:', error);
      setError('An error occurred while loading services.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!appointmentData.barberId) return;

    setLoading(true);
    setServices([]);
    setSelectedService('');
    setError('');

    loadServices();
  }, [appointmentData.barberId]);

  const handleNext = () => {
    if (!selectedService) return;

    const service = services.find((s) => s.id === selectedService);
    if (!service) return;

    setAppointmentData((prev) => ({
      ...prev,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: Number(service.price || 0),
      serviceDescription: service.description || '',
      serviceDurationMinutes: Number(service.durationMinutes || 0),
    }));

    nextStep();
  };

  return (
    <Box sx={{ display: 'flex', fontFamily: 'var(--font-nunito-sans)' }}>
      <Box
        sx={{
          width: 220,
          backgroundColor: '#000',
          borderRight: '3px solid #0b9cff',
          px: 2,
          py: 4,
          minHeight: '100vh',
        }}
      >
        <Stack spacing={4}>
          {steps.map((step, index) => {
            const active = index === 1;
            const completed = index < 1;

            return (
              <Stack
                key={step}
                direction="row"
                spacing={2}
                sx={{ alignItems: 'center' }}
              >
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor:
                      active || completed ? '#f4b400' : '#777',
                    color: active || completed ? '#000' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  {index + 1}
                </Box>

                <Typography
                  sx={{
                    color: active || completed ? '#fff' : '#999',
                    fontWeight: active ? 900 : 800,
                    fontSize: 18,
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
          backgroundColor: '#d9d9d9',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            borderBottom: '1px solid #aaa',
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontWeight: 900, fontSize: 34, color: '#111' }}>
            Service
          </Typography>

          <IconButton
            onClick={onCartClick}
            disabled={cartCount === 0}
            sx={{
              backgroundColor: '#fff',
              borderRadius: '50%',
              width: 48,
              height: 48,
              position: 'relative',
              '&:hover': { backgroundColor: '#f5f5f5' },
              '&.Mui-disabled': {
                backgroundColor: '#ddd',
                color: '#999',
              },
            }}
          >
            <ShoppingCartIcon sx={{ color: cartCount === 0 ? '#999' : '#111' }} />

            <Badge
              badgeContent={cartCount}
              color="error"
              sx={{
                position: 'absolute',
                top: 5,
                right: 5,
                '& .MuiBadge-badge': {
                  fontWeight: 900,
                  fontSize: 11,
                  minWidth: 18,
                  height: 18,
                },
              }}
            />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, p: 3 }}>
          {loading ? (
            <Typography>Loading services...</Typography>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : services.length === 0 ? (
            <Typography>No available services for this barber.</Typography>
          ) : (
            <Grid container spacing={4}>
              {services.map((service) => {
                const isSelected = selectedService === service.id;

                return (
                  <Grid
                    key={service.id}
                    size={{
                      xs: 12,
                      sm: 6,
                      md: 4,
                    }}
                  >
                    <Paper
                      onClick={() => setSelectedService(service.id)}
                      elevation={0}
                      sx={{
                        p: 4,
                        borderRadius: 4,
                        cursor: 'pointer',
                        backgroundColor: '#fff',
                        border: isSelected
                          ? '3px solid #f4b400'
                          : '1px solid #ddd',
                        transition: '0.2s',
                        minHeight: 240,
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 3,
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 900,
                          fontSize: '1.3rem',
                          color: '#111',
                        }}
                      >
                        {service.name}
                      </Typography>

                      <Typography
                        sx={{
                          color: '#f4b400',
                          fontWeight: 900,
                          fontSize: '1.1rem',
                          mt: 1,
                        }}
                      >
                        ₱{service.price.toLocaleString()}
                      </Typography>

                      <Typography
                        sx={{
                          color: '#555',
                          fontWeight: 800,
                          mt: 1,
                          mb: 2,
                        }}
                      >
                        Duration: {service.durationMinutes} mins
                      </Typography>

                      <Typography
                        sx={{
                          color: '#666',
                          mt: 2,
                          lineHeight: 1.7,
                        }}
                      >
                        {service.description}
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
            px: 3,
            py: 2,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Button
            onClick={prevStep}
            sx={{
              backgroundColor: '#d3d3d3',
              color: '#111',
              px: 6,
              py: 1,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 900,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              '&:hover': {
                backgroundColor: '#c8c8c8',
              },
            }}
          >
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!selectedService}
            sx={{
              backgroundColor: '#f4b400',
              color: '#111',
              px: 7,
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