'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import type { AppointmentData } from '@/app/appointment/page';

const steps = [
  'Barber',
  'Service',
  'Schedule',
  'Cart',
  'Confirmation',
];

interface CartStepProps {
  appointmentData: AppointmentData;
  setAppointmentData: React.Dispatch<React.SetStateAction<AppointmentData>>;
  nextStep: (appointmentDate?: string, startMinutes?: number, endMinutes?: number) => void;
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
            cartItems: prev.cartItems.filter((_, i) => i !== index)
        }));
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
      <Box
        sx={{
          flex: 1,
          backgroundColor: '#e5e5e5',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            borderBottom: '1px solid #bcbcbc',
            px: 4,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="h4"
            sx={{ fontWeight: 'bold', fontFamily: 'var(--font-nunito-sans)' }}
          >
            Cart
          </Typography>

          <IconButton
            sx={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '50%',
            }}
          >
            <ShoppingCartIcon />
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: 'red',
              }}
            />
          </IconButton>
        </Box>

        {/* CONTENT */}
        <Box
          sx={{
            flex: 1,
            p: 4,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* CART ITEMS ROW */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            {appointmentData.cartItems.map((item, index) => (
              <Box
                key={index}
                sx={{
                  width: 240,
                  backgroundColor: '#fff',
                  borderRadius: 2,
                  p: 2.5,
                }}
              >
                <Stack sx={{ direction: "row", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography sx={{ fontWeight: 'bold', fontFamily: 'var(--font-nunito-sans)' }}>
                    {item.serviceName}
                  </Typography>
                  <IconButton size="small" sx={{ color: 'red' }} onClick={() => handleDelete(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: '0.85rem', fontFamily: 'var(--font-nunito-sans)' }}>
                    Barber: {item.barberName}
                  </Typography>
                  <Typography sx={{ fontWeight: 'bold', fontSize: '0.85rem', fontFamily: 'var(--font-nunito-sans)' }}>
                    Schedule: {new Date(item.appointmentDate + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric'
                    })}
                    <br />
                    {minutesToTime(item.startMinutes)} - {minutesToTime(item.endMinutes)}
                  </Typography>
                  <Typography sx={{ fontWeight: 'bold', fontSize: '0.85rem', fontFamily: 'var(--font-nunito-sans)' }}>
                    Total: ₱ {item.servicePrice.toFixed(2)}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Box>

          {/* ADD NEW BOOKING */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
            <Button
              startIcon={<AddCircleOutlineIcon sx={{ color: '#39d000' }} />}
              onClick={resetToStart}
              sx={{
                backgroundColor: '#fff',
                color: '#000',
                borderRadius: 10,
                px: 3,
                py: 1,
                fontWeight: 600,
                textTransform: 'none',
                fontFamily: 'var(--font-nunito-sans)',
                border: '1px solid #ccc',
                '&:hover': { backgroundColor: '#f5f5f5' },
              }}
            >
              Add new Booking
            </Button>
          </Box>
        </Box>

        {/* FOOTER */}
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
            disabled
            onClick={prevStep}
            sx={{
              backgroundColor: '#d3d3d3',
              color: '#888',
              px: 6,
              py: 1.5,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 700,
              boxShadow: 'none',
            }}
          >
            Back
          </Button>

          <Button
            variant="contained"
            onClick={() => nextStep()}
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
  );
}