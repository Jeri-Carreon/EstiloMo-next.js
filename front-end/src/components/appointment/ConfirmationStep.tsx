'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import type { AppointmentData } from '@/app/appointment/page';

const steps = [
  'Barber',
  'Service',
  'Schedule',
  'Cart',
  'Confirmation',
];

interface ConfirmationStepProps {
  appointmentData: AppointmentData;
  prevStep: () => void;
  totalPrice: number;
  downPayment: number;
  paymentScreenshot: File | null;
  setPaymentScreenshot: React.Dispatch<React.SetStateAction<File | null>>;
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
  return new Date(date).toLocaleDateString('en-US', {
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
  paymentScreenshot,
  setPaymentScreenshot,
  loading,
  handleConfirm,
}: ConfirmationStepProps) {
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
            const active = index === 4;
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
          p: { xs: 2, md: 4 },
          fontFamily: 'var(--font-nunito-sans)',
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            mb: 3,
            color: '#111',
          }}
        >
          Confirmation
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
            gap: 3,
          }}
        >
          {/* LEFT: Payment */}
          <Box
            sx={{
              backgroundColor: '#fff',
              border: '1px solid #999',
              minHeight: 430,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ p: 3, flex: 1 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 26, mb: 1 }}>
                Deposit to Secure your Slot!
              </Typography>

              <Typography sx={{ color: '#666', fontWeight: 700, mb: 3 }}>
                Send your downpayment, then upload a screenshot of your payment.
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 230px' },
                  gap: 3,
                  alignItems: 'start',
                }}
              >
                <Box>
                  <Box
                    sx={{
                      border: '1px solid #bbb',
                      borderRadius: 1,
                      px: 2,
                      py: 1.2,
                      mb: 2,
                    }}
                  >
                    <Typography sx={{ color: '#888', fontWeight: 900, fontSize: 13 }}>
                      Mobile No.
                    </Typography>
                    <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                      09773644731
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      border: '1px solid #bbb',
                      borderRadius: 1,
                      px: 2,
                      py: 1.2,
                      mb: 3,
                    }}
                  >
                    <Typography sx={{ color: '#888', fontWeight: 900, fontSize: 13 }}>
                      Name
                    </Typography>
                    <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                      (North Fades) Al***** N**** M***
                    </Typography>
                  </Box>

                  <Typography sx={{ color: '#666', fontWeight: 800, mb: 1 }}>
                    Screenshot of ₱150 DP (REQUIRED)
                  </Typography>

                  <Button
                    component="label"
                    sx={{
                      backgroundColor: '#ddd',
                      color: '#111',
                      borderRadius: 10,
                      px: 3,
                      py: 1,
                      textTransform: 'none',
                      fontWeight: 900,
                      boxShadow: '0 3px 5px rgba(0,0,0,0.2)',
                      '&:hover': { backgroundColor: '#ccc' },
                    }}
                  >
                    {paymentScreenshot
                      ? paymentScreenshot.name
                      : 'Upload Payment Screenshot'}
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setPaymentScreenshot(e.target.files?.[0] || null);
                      }}
                    />
                  </Button>

                  <Box sx={{ mt: 3 }}>
                    <Typography sx={{ fontWeight: 900 }}>
                      Downpayment amount: ₱{downPayment.toFixed(2)}
                    </Typography>
                    <Typography sx={{ color: '#666', fontWeight: 700, fontSize: 13, mt: 1 }}>
                      Downpayments are non-refundable in case of cancellation.
                    </Typography>
                    <Typography sx={{ color: '#666', fontWeight: 700, fontSize: 13, mt: 1 }}>
                      Arriving more than 30 minutes late will be considered a "No-show".
                    </Typography>
                  </Box>
                </Box>

                {/* QR Code */}
                <Box
                  sx={{
                    backgroundColor: '#f4f4f4',
                    border: '1px solid #bbb',
                    borderRadius: 2,
                    p: 2,
                    textAlign: 'center',
                  }}
                >
                  <Typography sx={{ fontWeight: 900, mb: 1 }}>Payment QR</Typography>
                  <Box
                    sx={{
                      width: 150,
                      height: 150,
                      mx: 'auto',
                      backgroundColor: '#fff',
                      border: '2px solid #111',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gridTemplateRows: 'repeat(5, 1fr)',
                      gap: '4px',
                      p: 1,
                    }}
                  >
                    {Array.from({ length: 25 }).map((_, i) => (
                      <Box
                        key={i}
                        sx={{
                          backgroundColor: [0, 1, 3, 5, 6, 8, 10, 12, 14, 16, 18, 19, 21, 23, 24].includes(i)
                            ? '#111'
                            : '#fff',
                        }}
                      />
                    ))}
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 13, mt: 1 }}>Scan to Pay</Typography>
                  <Typography sx={{ color: '#666', fontSize: 12, mt: 0.5 }}>QR placeholder only</Typography>
                </Box>
              </Box>
            </Box>

            {/* Total Price Footer */}
            <Box
              sx={{
                backgroundColor: '#b9e5c1',
                px: 3,
                py: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #999',
              }}
            >
              <Typography sx={{ color: '#21a44c', fontWeight: 900 }}>Total Price</Typography>
              <Typography sx={{ fontSize: 28, fontWeight: 900 }}>₱ {totalPrice.toFixed(2)}</Typography>
            </Box>
          </Box>

          {/* RIGHT: Summary */}
          <Box
            sx={{
              backgroundColor: '#fff',
              border: '1px solid #777',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ p: 3, flex: 1 }}>
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

              {appointmentData.cartItems[0] && (
                <>
                  <Typography sx={{ fontWeight: 900, fontSize: 26 }}>
                    {appointmentData.cartItems[0].serviceName}
                  </Typography>
                  <Typography sx={{ color: '#f4b400', fontWeight: 900, fontSize: 18, mt: 0.5 }}>
                    {formatDate(appointmentData.cartItems[0].appointmentDate)},{' '}
                    {formatTime(appointmentData.cartItems[0].startMinutes)}
                  </Typography>
                  <Box sx={{ borderBottom: '1px solid #ddd', mt: 2 }} />
                </>
              )}
            </Box>

            {/* Cost Breakdown */}
            <Box sx={{ p: 3, borderTop: '1px solid #ddd' }}>
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
                  sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                >
                  <Typography>{item.serviceName}</Typography>
                  <Typography>₱{item.servicePrice.toFixed(2)}</Typography>
                </Box>
              ))}

              <Box sx={{ borderBottom: '1px solid #111', my: 1.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 900, fontSize: 24 }}>Total Price</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 24 }}>₱{totalPrice.toFixed(2)}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Footer Buttons */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Button
            onClick={prevStep}
            sx={{
              backgroundColor: '#ddd',
              color: '#111',
              px: 6,
              py: 1.3,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 900,
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
              px: 7,
              py: 1.3,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 900,
              '&:hover': { backgroundColor: '#e0a800' },
              '&:disabled': { backgroundColor: '#f5dc90', color: '#777' },
            }}
          >
            {loading ? 'Confirming...' : 'Confirm'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}