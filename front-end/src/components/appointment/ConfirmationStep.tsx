'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CheckIcon from '@mui/icons-material/Check';
import PaymentIcon from '@mui/icons-material/Payment';

import type { AppointmentData } from '@/app/appointment/page';

const steps = ['Barber', 'Service', 'Schedule', 'Cart', 'Confirmation'];

interface ConfirmationStepProps {
  appointmentData: AppointmentData;
  prevStep: () => void;
  totalPrice: number;
  downPayment: number;
  loading: boolean;
  handleConfirm: () => void;
}

function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalHour = hour % 12 || 12;

  return `${normalHour}:${minute.toString().padStart(2, '0')} ${suffix}`;
}

function formatDate(date: string) {
  if (!date) return '';

  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ConfirmationStep({
  appointmentData,
  prevStep,
  totalPrice,
  downPayment,
  loading,
  handleConfirm,
}: ConfirmationStepProps) {
  const remainingBalance = Math.max(totalPrice - downPayment, 0);

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
            const completed = index < 4;
            const active = index === 4;

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
                    backgroundColor: completed || active ? '#f4b400' : '#777',
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
          }}
        >
          <Typography
            sx={{ fontWeight: 900, fontSize: { xs: 28, sm: 34 }, color: '#111' }}
          >
            Confirmation
          </Typography>
        </Box>

        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, minWidth: 0 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
              gap: 3,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                backgroundColor: '#fff',
                border: '1px solid #999',
                minHeight: { xs: 'auto', md: 430 },
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              <Box sx={{ p: { xs: 2, sm: 3 }, flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{ fontWeight: 900, fontSize: { xs: 22, sm: 26 }, mb: 1 }}
                >
                  Pay ₱{downPayment.toFixed(2)} Downpayment to Secure Your Slot
                </Typography>

                <Typography sx={{ color: '#666', fontWeight: 700, mb: 3 }}>
                  You will be redirected to PayMongo to pay the downpayment. No screenshot upload is needed.
                </Typography>

                <Box
                  sx={{
                    backgroundColor: '#f4f4f4',
                    border: '1px solid #bbb',
                    borderRadius: 2,
                    p: { xs: 2, sm: 3 },
                    mb: 3,
                  }}
                >
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        backgroundColor: '#f4b400',
                        color: '#111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <PaymentIcon />
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                        Secure PayMongo Checkout
                      </Typography>
                      <Typography sx={{ color: '#666', fontWeight: 700 }}>
                        Supports available PayMongo payment channels.
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      borderBottom: '1px solid #ddd',
                      pb: 1,
                    }}
                  >
                    <Typography sx={{ fontWeight: 800 }}>Total Price</Typography>
                    <Typography sx={{ fontWeight: 900 }}>
                      ₱{totalPrice.toFixed(2)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      borderBottom: '1px solid #ddd',
                      pb: 1,
                    }}
                  >
                    <Typography sx={{ fontWeight: 800 }}>
                      PayMongo Downpayment
                    </Typography>
                    <Typography sx={{ fontWeight: 900, color: '#21a44c' }}>
                      ₱{downPayment.toFixed(2)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <Typography sx={{ fontWeight: 800 }}>
                      Remaining Balance
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>
                      ₱{remainingBalance.toFixed(2)}
                    </Typography>
                  </Box>
                </Stack>

                <Box sx={{ mt: 3 }}>
                  <Typography
                    sx={{
                      color: '#666',
                      fontWeight: 700,
                      fontSize: 13,
                      mt: 1,
                    }}
                  >
                    The remaining balance will be paid at the shop through Cash or GCash after the service.
                  </Typography>

                  <Typography
                    sx={{
                      color: '#666',
                      fontWeight: 700,
                      fontSize: 13,
                      mt: 1,
                    }}
                  >
                    Downpayments are non-refundable in case of cancellation.
                  </Typography>

                  <Typography
                    sx={{
                      color: '#666',
                      fontWeight: 700,
                      fontSize: 13,
                      mt: 1,
                    }}
                  >
                    Arriving more than 30 minutes late will be considered a &quot;No-show&quot;.
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  backgroundColor: '#b9e5c1',
                  px: { xs: 2, sm: 3 },
                  py: 2,
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 1,
                  borderTop: '1px solid #999',
                }}
              >
                <Typography sx={{ color: '#21a44c', fontWeight: 900 }}>
                  Total Price
                </Typography>

                <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 900 }}>
                  ₱ {totalPrice.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                backgroundColor: '#fff',
                border: '1px solid #777',
                display: 'flex',
                flexDirection: 'column',
                height: { xs: 'auto', md: 650 },
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  p: { xs: 2, sm: 3 },
                  flex: 1,
                  overflowY: { xs: 'visible', md: 'auto' },
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#bbb',
                    borderRadius: '10px',
                  },
                }}
              >
                <Typography
                  sx={{
                    letterSpacing: 2,
                    fontWeight: 900,
                    fontSize: 14,
                    mb: 3,
                    color: '#111',
                  }}
                >
                  SUMMARY
                </Typography>

                {appointmentData.cartItems.map((item, index) => (
                  <Box
                    key={`${item.serviceId}-${item.appointmentDate}-${item.startMinutes}-${index}`}
                    sx={{
                      borderBottom: '1px solid #ddd',
                      pb: 2,
                      mb: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: { xs: 20, sm: 24 },
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {item.serviceName}
                    </Typography>

                    <Typography
                      sx={{
                        color: '#666',
                        fontWeight: 800,
                        fontSize: 14,
                        mt: 0.5,
                      }}
                    >
                      Duration: {item.serviceDurationMinutes} mins
                    </Typography>

                    <Typography
                      sx={{
                        color: '#f4b400',
                        fontWeight: 900,
                        fontSize: 16,
                        mt: 0.5,
                      }}
                    >
                      {formatDate(item.appointmentDate)},{' '}
                      {formatTime(item.startMinutes)}
                    </Typography>

                    <Typography sx={{ color: '#555', fontWeight: 700, mt: 1 }}>
                      Barber: {item.barberName}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{ p: { xs: 2, sm: 3 }, borderTop: '1px solid #ddd' }}>
                <Typography
                  sx={{
                    color: '#777',
                    fontWeight: 900,
                    letterSpacing: 2,
                    fontSize: 13,
                    mb: 2,
                  }}
                >
                  COST BREAKDOWN
                </Typography>

                {appointmentData.cartItems.map((item, index) => (
                  <Box
                    key={`${item.serviceId}-${index}`}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      mb: 1,
                    }}
                  >
                    <Typography sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                      {item.serviceName}
                    </Typography>
                    <Typography>₱{item.servicePrice.toFixed(2)}</Typography>
                  </Box>
                ))}

                <Box sx={{ borderBottom: '1px solid #111', my: 1.5 }} />

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 1,
                  }}
                >
                  <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, sm: 24 } }}>
                    Total Price
                  </Typography>

                  <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, sm: 24 } }}>
                    ₱{totalPrice.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>
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
              '&:hover': {
                backgroundColor: '#c8c8c8',
              },
            }}
          >
            Back
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={loading}
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
            {loading ? 'Redirecting...' : `Pay ₱${downPayment.toFixed(2)} DP`}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}