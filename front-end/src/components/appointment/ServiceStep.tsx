'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

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
}

export default function ServiceStep({
  appointmentData,
  setAppointmentData,
  nextStep,
  prevStep,
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
    <Box sx={{ display: 'flex' }}>
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
            const active = index === 1;

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

      <Box
        sx={{
          flex: 1,
          backgroundColor: '#e5e5e5',
          minHeight: '100vh',
        }}
      >
        <Box
          sx={{
            borderBottom: '1px solid #bbb',
            px: 4,
            py: 3,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              fontFamily: 'var(--font-nunito-sans)',
            }}
          >
            Service
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
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
                          fontWeight: 'bold',
                          fontSize: '1.3rem',
                          fontFamily: 'var(--font-nunito-sans)',
                        }}
                      >
                        {service.name}
                      </Typography>

                      <Typography
                        sx={{
                          color: '#f4b400',
                          fontWeight: 'bold',
                          fontSize: '1.1rem',
                          mt: 1,
                          fontFamily: 'var(--font-nunito-sans)',
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
                          fontFamily: 'var(--font-nunito-sans)',
                        }}
                      >
                        Duration: {service.durationMinutes} mins
                      </Typography>

                      <Typography
                        sx={{
                          color: '#666',
                          mt: 2,
                          lineHeight: 1.7,
                          fontFamily: 'var(--font-nunito-sans)',
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
            borderTop: '1px solid #bbb',
            px: 4,
            py: 3,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Button
            variant="contained"
            onClick={prevStep}
            sx={{
              backgroundColor: '#cfcfcf',
              color: '#000',
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
            disabled={!selectedService}
            onClick={handleNext}
            sx={{
              backgroundColor: '#f4b400',
              color: '#000',
              px: 6,
              py: 1.5,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 'bold',
              boxShadow: 'none',
              '&.Mui-disabled': {
                backgroundColor: '#d9d9d9',
                color: '#888',
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