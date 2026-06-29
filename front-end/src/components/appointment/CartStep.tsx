'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';

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
            const completed = index < 3;
            const active = index === 3;

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
                    backgroundColor:
                      completed || active ? '#f4b400' : '#777',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: { xs: 12, md: 14 },
                  }}
                >
                  {completed ? (
                    <CheckIcon sx={{ fontSize: { xs: 18, md: 20 } }} />
                  ) : (
                    index + 1
                  )}
                </Box>

                <Typography
                  sx={{
                    color: completed || active ? '#fff' : '#999',
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
            sx={{
              fontWeight: 900,
              fontSize: { xs: 28, sm: 34 },
              color: '#111',
            }}
          >
            Cart
          </Typography>

          <IconButton
            disabled={appointmentData.cartItems.length === 0}
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
              badgeContent={appointmentData.cartItems.length}
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
                  color:
                    appointmentData.cartItems.length === 0 ? '#999' : '#111',
                }}
              />
            </Badge>
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'flex-start',
              minWidth: 0,
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
                    width: { xs: '100%', sm: 255 },
                    maxWidth: '100%',
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
                      fontSize: { xs: 20, sm: 22 },
                      pr: 4,
                      mb: 1,
                      color: '#111',
                    }}
                  >
                    {item.serviceName}
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: 13,
                      color: '#666',
                      mb: 3,
                    }}
                  >
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

          <Box
            sx={{
              display: 'flex',
              justifyContent: { xs: 'stretch', sm: 'flex-end' },
              mt: 3,
            }}
          >
            <Button
              startIcon={<AddCircleIcon sx={{ color: '#59d96b' }} />}
              onClick={resetToStart}
              sx={{
                backgroundColor: '#fff',
                color: '#111',
                borderRadius: 10,
                width: { xs: '100%', sm: 'auto' },
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
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Button
            onClick={prevStep}
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