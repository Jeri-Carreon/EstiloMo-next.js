'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BarberStep from '@/components/appointment/BarberStep';
import ServiceStep from '@/components/appointment/ServiceStep';
import ScheduleStep from '@/components/appointment/ScheduleStep';
import CartStep from '@/components/appointment/CartStep';

export interface CartItem {
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDescription: string;
  appointmentDate: string;
  startMinutes: number;
  endMinutes: number;
}

export interface AppointmentData {
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDescription: string;
  appointmentDate?: string;
  startMinutes?: number;
  endMinutes?: number;
  cartItems: CartItem[];
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

export default function AppointmentPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [appointmentData, setAppointmentData] =
    useState<AppointmentData>({
      barberId: '',
      barberName: '',
      serviceId: '',
      serviceName: '',
      servicePrice: 0,
      serviceDescription: '',
      appointmentDate: '',
      startMinutes: 0,
      endMinutes: 0,
      cartItems: [],
    });

  const nextStep = (
    appointmentDate?: string,
    startMinutes?: number,
    endMinutes?: number
  ) => {
    if (currentStep === 2 && appointmentDate) {
      setAppointmentData((prev) => ({
        ...prev,
        cartItems: [
          ...prev.cartItems,
          {
            barberId: prev.barberId,
            barberName: prev.barberName,
            serviceId: prev.serviceId,
            serviceName: prev.serviceName,
            servicePrice: prev.servicePrice,
            serviceDescription: prev.serviceDescription,
            appointmentDate: appointmentDate ?? '',
            startMinutes: startMinutes ?? 0,
            endMinutes: endMinutes ?? 0,
          },
        ],
        barberId: '',
        barberName: '',
        serviceId: '',
        serviceName: '',
        servicePrice: 0,
        serviceDescription: '',
        appointmentDate: '',
        startMinutes: 0,
        endMinutes: 0,
      }));
    }

    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const resetToStart = () => {
    const hasValidBooking =
      appointmentData.barberId &&
      appointmentData.serviceId &&
      appointmentData.appointmentDate &&
      appointmentData.startMinutes !== undefined &&
      appointmentData.endMinutes !== undefined;

    if (!hasValidBooking) {
      setCurrentStep(0);
      return;
    }

    const isDuplicate = appointmentData.cartItems.some(
      (item) =>
        item.barberId === appointmentData.barberId &&
        item.appointmentDate === appointmentData.appointmentDate &&
        item.startMinutes === appointmentData.startMinutes
    );

    if (isDuplicate) {
      alert('This appointment is already in your cart.');
      return;
    }

    setAppointmentData((prev) => ({
      barberId: '',
      barberName: '',
      serviceId: '',
      serviceName: '',
      servicePrice: 0,
      serviceDescription: '',
      appointmentDate: '',
      startMinutes: 0,
      endMinutes: 0,
      cartItems: [
        ...prev.cartItems,
        {
          barberId: prev.barberId,
          barberName: prev.barberName,
          serviceId: prev.serviceId,
          serviceName: prev.serviceName,
          servicePrice: prev.servicePrice,
          serviceDescription: prev.serviceDescription,
          appointmentDate: prev.appointmentDate ?? '',
          startMinutes: prev.startMinutes ?? 0,
          endMinutes: prev.endMinutes ?? 0,
        },
      ],
    }));

    setCurrentStep(0);
  };

  const totalPrice = appointmentData.cartItems.reduce(
    (sum, item) => sum + item.servicePrice,
    0
  );

  const downPayment = 150;

  const handleConfirm = async () => {
    if (appointmentData.cartItems.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    if (!paymentScreenshot) {
      alert('Please upload your payment screenshot.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('paymentMethod', 'GCASH');
      formData.append('downPayment', String(downPayment));
      formData.append('totalPrice', String(totalPrice));
      formData.append('cartItems', JSON.stringify(appointmentData.cartItems));

      if (paymentScreenshot) {
        formData.append('paymentScreenshot', paymentScreenshot);
      }

      const res = await fetch('/api/appointment/confirm', {
        method: 'POST',
        body: formData,
      });

      const text = await res.text();

      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        console.error('NON-JSON API RESPONSE:', text);
        alert(text || 'Failed to confirm appointment.');
        return;
      }

      if (!res.ok) {
        alert(data.error || 'Failed to confirm appointment.');
        return;
      }

      setSuccessOpen(true);
    } catch (error) {
      console.error(error);
      alert('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#000' }}>
      <Navbar />

      {currentStep === 0 && (
        <BarberStep
          appointmentData={appointmentData}
          setAppointmentData={setAppointmentData}
          nextStep={nextStep}
        />
      )}

      {currentStep === 1 && (
        <ServiceStep
          appointmentData={appointmentData}
          setAppointmentData={setAppointmentData}
          nextStep={nextStep}
          prevStep={prevStep}
        />
      )}

      {currentStep === 2 && (
        <ScheduleStep
          appointmentData={appointmentData}
          setAppointmentData={setAppointmentData}
          nextStep={nextStep}
          prevStep={prevStep}
        />
      )}

      {currentStep === 3 && (
        <CartStep
          appointmentData={appointmentData}
          setAppointmentData={setAppointmentData}
          nextStep={nextStep}
          prevStep={prevStep}
          resetToStart={resetToStart}
        />
      )}

      {currentStep === 4 && (
        <Box
          sx={{
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
                      <Typography
                        sx={{
                          color: '#888',
                          fontWeight: 900,
                          fontSize: 13,
                        }}
                      >
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
                      <Typography
                        sx={{
                          color: '#888',
                          fontWeight: 900,
                          fontSize: 13,
                        }}
                      >
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
                        '&:hover': {
                          backgroundColor: '#ccc',
                        },
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
                        Arriving more than 30 minutes late will be considered a
                        “No-show”.
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      backgroundColor: '#f4f4f4',
                      border: '1px solid #bbb',
                      borderRadius: 2,
                      p: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography sx={{ fontWeight: 900, mb: 1 }}>
                      Payment QR
                    </Typography>

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
                            backgroundColor: [
                              0, 1, 3, 5, 6, 8, 10, 12, 14, 16, 18, 19, 21,
                              23, 24,
                            ].includes(i)
                              ? '#111'
                              : '#fff',
                          }}
                        />
                      ))}
                    </Box>

                    <Typography sx={{ fontWeight: 800, fontSize: 13, mt: 1 }}>
                      Scan to Pay
                    </Typography>

                    <Typography sx={{ color: '#666', fontSize: 12, mt: 0.5 }}>
                      QR placeholder only
                    </Typography>
                  </Box>
                </Box>
              </Box>

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
                <Typography sx={{ color: '#21a44c', fontWeight: 900 }}>
                  Total Price
                </Typography>

                <Typography sx={{ fontSize: 28, fontWeight: 900 }}>
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

                    <Typography
                      sx={{
                        color: '#f4b400',
                        fontWeight: 900,
                        fontSize: 18,
                        mt: 0.5,
                      }}
                    >
                      {formatDate(appointmentData.cartItems[0].appointmentDate)},{' '}
                      {formatTime(appointmentData.cartItems[0].startMinutes)}
                    </Typography>

                    <Box sx={{ borderBottom: '1px solid #ddd', mt: 2 }} />
                  </>
                )}
              </Box>

              <Box
                sx={{
                  p: 3,
                  borderTop: '1px solid #ddd',
                }}
              >
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
                      mb: 1,
                    }}
                  >
                    <Typography>{item.serviceName}</Typography>
                    <Typography>₱{item.servicePrice.toFixed(2)}</Typography>
                  </Box>
                ))}

                <Box sx={{ borderBottom: '1px solid #111', my: 1.5 }} />

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography sx={{ fontWeight: 900, fontSize: 24 }}>
                    Total Price
                  </Typography>

                  <Typography sx={{ fontWeight: 900, fontSize: 24 }}>
                    ₱{totalPrice.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              mt: 3,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
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
                '&:hover': {
                  backgroundColor: '#e0a800',
                },
                '&:disabled': {
                  backgroundColor: '#f5dc90',
                  color: '#777',
                },
              }}
            >
              {loading ? 'Confirming...' : 'Confirm'}
            </Button>
          </Box>
        </Box>
      )}

      <Modal open={successOpen}>
        <Box
          sx={{
            width: { xs: '90%', md: 720 },
            backgroundColor: '#fff',
            borderRadius: 3,
            p: { xs: 3, md: 6 },
            textAlign: 'center',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: 24,
            outline: 'none',
          }}
        >
          <Box
            sx={{
              width: 115,
              height: 115,
              backgroundColor: '#f1f1f1',
              borderRadius: '50%',
              mx: 'auto',
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 70, color: '#2ebd4f' }} />
          </Box>

          <Typography
            sx={{
              fontSize: { xs: 30, md: 40 },
              fontWeight: 1000,
              color: '#09a84f',
              lineHeight: 1.1,
              mb: 2,
            }}
          >
            APPOINTMENT BOOKED SUCCESSFULLY!
          </Typography>

          <Typography sx={{ fontWeight: 900, fontSize: 18, mb: 4 }}>
            We will notify you when your appointment is confirmed by our receptionist.
          </Typography>

          <Typography sx={{ fontWeight: 900, fontSize: 18, mb: 5 }}>
            Thank you for trusting The Barbs Bro!
          </Typography>

          <Button
            href="/"
            sx={{
              backgroundColor: '#ddd',
              color: '#111',
              px: 6,
              py: 1.5,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 900,
              fontSize: 20,
              boxShadow: '0 3px 5px rgba(0,0,0,0.2)',
            }}
          >
            View Appointments
          </Button>
        </Box>
      </Modal>

      <Footer />
    </Box>
  );
}