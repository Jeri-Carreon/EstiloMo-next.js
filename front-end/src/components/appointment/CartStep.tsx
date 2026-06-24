'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CheckIcon from '@mui/icons-material/Check';

import type { AppointmentData } from '@/app/appointment/page';

const steps = ['Barber', 'Service', 'Schedule', 'Cart', 'Confirmation'];

interface CartStepProps {
  appointmentData: AppointmentData;
  setAppointmentData: React.Dispatch<React.SetStateAction<AppointmentData>>;
  nextStep: (
    appointmentDate?: string,
    startMinutes?: number,
    endMinutes?: number
  ) => void;
  prevStep: () => void;
  resetToStart: () => void;
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, '0')}${ampm}`;
}

function formatDate(date: string) {
  if (!date) return '';

  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CartStep({
  appointmentData,
  setAppointmentData,
  nextStep,
  prevStep,
  resetToStart,
}: CartStepProps) {
  const handleDelete = (index: number) => {
    setAppointmentData((prev) => ({
      ...prev,
      cartItems: prev.cartItems.filter((_, i) => i !== index),
    }));
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
            const completed = index < 3;
            const active = index === 3;

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
                      completed || active ? '#f4b400' : '#777',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  {completed ? <CheckIcon sx={{ fontSize: 20 }} /> : index + 1}
                </Box>

                <Typography
                  sx={{
                    color: completed || active ? '#fff' : '#999',
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
            Cart
          </Typography>

          <IconButton
            sx={{
              backgroundColor: '#fff',
              borderRadius: '50%',
              width: 48,
              height: 48,
              position: 'relative',
              '&:hover': { backgroundColor: '#f5f5f5' },
            }}
          >
            <ShoppingCartIcon sx={{ color: '#111' }} />

            <Box
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: '#ff2f2f',
                color: '#fff',
                fontSize: 11,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {appointmentData.cartItems.length}
            </Box>
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'flex-start',
            }}
          >
            {appointmentData.cartItems.length === 0 ? (
              <Typography sx={{ fontWeight: 800, color: '#555' }}>
                Your cart is empty.
              </Typography>
            ) : (
              appointmentData.cartItems.map((item, index) => (
                <Box
                  key={`${item.serviceId}-${item.appointmentDate}-${item.startMinutes}-${index}`}
                  sx={{
                    width: 255,
                    minHeight: 300,
                    backgroundColor: '#fff',
                    borderRadius: 1,
                    p: 2,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                    position: 'relative',
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(index)}
                    sx={{
                      position: 'absolute',
                      top: 10,
                      right: 8,
                      color: '#ff2f2f',
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>

                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: 22,
                      pr: 4,
                      mb: 1,
                      color: '#111',
                    }}
                  >
                    {item.serviceName}
                  </Typography>

                  <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#666', mb: 3 }}>
                    Duration: {item.serviceDurationMinutes} mins
                  </Typography>

                  <Typography sx={{ fontWeight: 900, fontSize: 14, mb: 2 }}>
                    Barber: {item.barberName}
                  </Typography>

                  <Typography sx={{ fontWeight: 900, fontSize: 14, mb: 2 }}>
                    Schedule: {formatDate(item.appointmentDate)}
                    <br />
                    {minutesToTime(item.startMinutes)} -{' '}
                    {minutesToTime(item.endMinutes)}
                  </Typography>

                  <Typography sx={{ fontWeight: 900, fontSize: 14 }}>
                    Total: ₱ {item.servicePrice.toFixed(2)}
                  </Typography>
                </Box>
              ))
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              startIcon={<AddCircleIcon sx={{ color: '#59d96b' }} />}
              onClick={resetToStart}
              sx={{
                backgroundColor: '#fff',
                color: '#111',
                borderRadius: 10,
                px: 2,
                py: 1,
                fontWeight: 900,
                textTransform: 'none',
                boxShadow: '0 2px 5px rgba(0,0,0,0.22)',
                '&:hover': { backgroundColor: '#f5f5f5' },
              }}
            >
              Add new Booking
            </Button>
          </Box>
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
            }}
          >
            Back
          </Button>

          <Button
            onClick={() => nextStep()}
            disabled={appointmentData.cartItems.length === 0}
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