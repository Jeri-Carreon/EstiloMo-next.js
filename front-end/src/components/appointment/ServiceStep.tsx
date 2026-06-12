'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import type { AppointmentData } from '@/app/appointment/page';

const steps = [
  'Barber',
  'Service',
  'Schedule',
  'Cart',
  'Confirmation',
];

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface ServiceStepProps {
  appointmentData: AppointmentData;

  setAppointmentData: React.Dispatch<
    React.SetStateAction<AppointmentData>
  >;

  nextStep: (appointmentDate?: string, startMinutes?: number, endMinutes?: number) => void;

  prevStep: () => void;
}

export default function ServiceStep({
  appointmentData,
  setAppointmentData,
  nextStep,
  prevStep,
}: ServiceStepProps) {
  const [services, setServices] = useState<Service[]>([]);

  const [selectedService, setSelectedService] =
    useState<string>(
      appointmentData.serviceId || ''
    );

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const loadServices = async () => {
    try {
      const res = await fetch(
        `/api/appointment/services?barberId=${appointmentData.barberId}`
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            'Unable to load services.'
        );

        setServices([]);
      } else {
        setError('');

        setServices(data.services || []);
      }
    } catch (error) {
      setError(
        'An error occurred while loading services.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (!appointmentData.barberId) return;

  setLoading(true); // 🔥 IMPORTANT FIX
  setServices([]);
  setError('');

  loadServices();
}, [appointmentData.barberId]);

  const handleNext = () => {
    if (!selectedService) return;

    const service = services.find(
      (s) => s.id === selectedService
    );

    if (!service) return;

    setAppointmentData((prev) => ({
      ...prev,

      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      serviceDescription:
        service.description,
    }));

    nextStep();
  };

  return (
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
            const active = index === 1;

            return (
              <Stack
                key={step}
                direction="row"
                spacing={2}
                sx={{
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: active
                      ? '#f4b400'
                      : '#777',

                    color: active
                      ? '#000'
                      : '#fff',

                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'center',

                    fontWeight: 'bold',
                  }}
                >
                  {index + 1}
                </Box>

                <Typography
                  sx={{
                    color: active
                      ? '#fff'
                      : '#aaa',

                    fontWeight: active
                      ? 'bold'
                      : 'normal',

                    fontFamily:
                      'var(--font-nunito-sans)',
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
      <Box
        sx={{
          flex: 1,
          backgroundColor: '#e5e5e5',
          minHeight: '100vh',
        }}
      >
        {/* TITLE */}
        <Box
          sx={{
            borderBottom:
              '1px solid #bbb',

            px: 4,
            py: 3,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              fontFamily:
                'var(--font-nunito-sans)',
            }}
          >
            Service
          </Typography>
        </Box>

        {/* SERVICES */}
        <Box sx={{ p: 4 }}>
          {loading ? (
            <Typography>
              Loading services...
            </Typography>
          ) : error ? (
            <Typography color="error">
              {error}
            </Typography>
          ) : (
            <Grid container spacing={4}>
              {services.map((service) => {
                const isSelected =
                  selectedService ===
                  service.id;

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
                      onClick={() =>
                        setSelectedService(
                          service.id
                        )
                      }
                      elevation={0}
                      sx={{
                        p: 4,
                        borderRadius: 4,
                        cursor: 'pointer',

                        border: isSelected
                          ? '3px solid #f4b400'
                          : '1px solid #ddd',

                        transition: '0.2s',

                        minHeight: 220,

                        '&:hover': {
                          transform:
                            'translateY(-4px)',

                          boxShadow: 3,
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '1.3rem',

                          fontFamily:
                            'var(--font-nunito-sans)',
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

                          fontFamily:
                            'var(--font-nunito-sans)',
                        }}
                      >
                        ₱
                        {service.price.toLocaleString()}
                      </Typography>

                      <Typography
                        sx={{
                          color: '#666',
                          mt: 2,
                          lineHeight: 1.7,

                          fontFamily:
                            'var(--font-nunito-sans)',
                        }}
                      >
                        {
                          service.description
                        }
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
            justifyContent:
              'space-between',
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
                backgroundColor:
                  '#d9d9d9',

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