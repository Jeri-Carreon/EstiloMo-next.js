'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';

import DeleteIcon from '@mui/icons-material/Delete';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BarberStep from '@/components/appointment/BarberStep';
import ServiceStep from '@/components/appointment/ServiceStep';
import ScheduleStep from '@/components/appointment/ScheduleStep';
import CartStep from '@/components/appointment/CartStep';
import ConfirmationStep from '@/components/appointment/ConfirmationStep';

export interface CartItem {
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDescription: string;
  serviceDurationMinutes: number;
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
  serviceDurationMinutes: number;
  appointmentDate?: string;
  startMinutes?: number;
  endMinutes?: number;
  cartItems: CartItem[];
}

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
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

  const [warningOpen, setWarningOpen] = useState(false);
  const [warningTitle, setWarningTitle] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  const [cartOpen, setCartOpen] = useState(false);

  const [appointmentData, setAppointmentData] = useState<AppointmentData>({
    barberId: '',
    barberName: '',
    serviceId: '',
    serviceName: '',
    servicePrice: 0,
    serviceDescription: '',
    serviceDurationMinutes: 0,
    appointmentDate: '',
    startMinutes: 0,
    endMinutes: 0,
    cartItems: [],
  });

  const showWarning = (title: string, message: string) => {
    setWarningTitle(title);
    setWarningMessage(message);
    setWarningOpen(true);
  };

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
            serviceDurationMinutes: prev.serviceDurationMinutes,
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
        serviceDurationMinutes: 0,
      }));
    }

    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const removeCartItem = (indexToRemove: number) => {
    setAppointmentData((prev) => ({
      ...prev,
      cartItems: prev.cartItems.filter((_, index) => index !== indexToRemove),
    }));
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
      showWarning(
        'Duplicate Appointment',
        'This appointment is already in your cart.'
      );
      return;
    }

    setAppointmentData((prev) => ({
      barberId: '',
      barberName: '',
      serviceId: '',
      serviceName: '',
      servicePrice: 0,
      serviceDescription: '',
      serviceDurationMinutes: 0,
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
          serviceDurationMinutes: prev.serviceDurationMinutes,
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
      showWarning('Empty Cart', 'Your cart is empty.');
      return;
    }

    if (!paymentScreenshot) {
      showWarning(
        'Missing Payment Screenshot',
        'Please upload your payment screenshot.'
      );
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
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
        showWarning(
          'Confirmation Failed',
          text || 'Failed to confirm appointment.'
        );
        return;
      }

      if (!res.ok) {
        showWarning(
          'Confirmation Failed',
          data.error || 'Failed to confirm appointment.'
        );
        return;
      }

      setSuccessOpen(true);
    } catch (error) {
      console.error(error);
      showWarning('Something Went Wrong', 'Something went wrong.');
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
          cartCount={appointmentData.cartItems.length}
          onCartClick={() => setCartOpen(true)}
        />
      )}

      {currentStep === 1 && (
        <ServiceStep
          appointmentData={appointmentData}
          setAppointmentData={setAppointmentData}
          nextStep={nextStep}
          prevStep={prevStep}
          cartCount={appointmentData.cartItems.length}
          onCartClick={() => setCartOpen(true)}
        />
      )}

      {currentStep === 2 && (
        <ScheduleStep
          appointmentData={appointmentData}
          setAppointmentData={setAppointmentData}
          nextStep={nextStep}
          prevStep={prevStep}
          cartCount={appointmentData.cartItems.length}
          onCartClick={() => setCartOpen(true)}
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
        <ConfirmationStep
          appointmentData={appointmentData}
          prevStep={prevStep}
          totalPrice={totalPrice}
          downPayment={downPayment}
          paymentScreenshot={paymentScreenshot}
          setPaymentScreenshot={setPaymentScreenshot}
          handleConfirm={handleConfirm}
          loading={loading}
        />
      )}

      <Footer />

      <Drawer
        anchor="right"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        slotProps={{
          paper: {
            sx: {
              top: 96,
              bottom: 88,
              height: 'auto',
              width: { xs: 320, sm: 410 },
              borderRadius: '16px 0 0 16px',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box
          sx={{
            height: '100%',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography sx={{ fontSize: 24, fontWeight: 900, mb: 2 }}>
            Your Booking Cart
          </Typography>

          {appointmentData.cartItems.length === 0 ? (
            <Typography sx={{ color: '#666' }}>Your cart is empty.</Typography>
          ) : (
            <>
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  pr: 1,
                }}
              >
                {appointmentData.cartItems.map((item, index) => (
                  <Box
                    key={`${item.serviceId}-${item.appointmentDate}-${item.startMinutes}-${index}`}
                    sx={{
                      border: '1px solid #ddd',
                      borderRadius: 2,
                      p: 2,
                      mb: 2,
                      bgcolor: '#fff',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 1,
                      }}
                    >
                      <Typography sx={{ fontWeight: 900, fontSize: 17 }}>
                        {item.serviceName}
                      </Typography>

                      <IconButton
                        size="small"
                        onClick={() => removeCartItem(index)}
                        sx={{ color: '#b91c1c' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <Typography>Barber: {item.barberName}</Typography>
                    <Typography>Duration: {item.serviceDurationMinutes} mins</Typography>
                    <Typography>Date: {formatDate(item.appointmentDate)}</Typography>

                    <Typography>
                      Time: {formatTime(item.startMinutes)} - {formatTime(item.endMinutes)}
                    </Typography>

                    <Typography sx={{ fontWeight: 700, mt: 2 }}>
                      ₱ {item.servicePrice.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 3,
                }}
              >
                <Typography sx={{ fontWeight: 900 }}>Total</Typography>
                <Typography sx={{ fontWeight: 900 }}>
                  ₱ {totalPrice.toFixed(2)}
                </Typography>
              </Box>

              <Button
                fullWidth
                onClick={() => {
                  setCartOpen(false);
                  setCurrentStep(3);
                }}
                sx={{
                  bgcolor: '#000',
                  color: '#fff',
                  borderRadius: 10,
                  py: 1.2,
                  textTransform: 'none',
                  fontWeight: 900,
                  '&:hover': { bgcolor: '#222' },
                }}
              >
                Go to Cart
              </Button>
            </>
          )}
        </Box>
      </Drawer>

      <Modal open={warningOpen} onClose={() => setWarningOpen(false)}>
        <Box
          sx={{
            width: { xs: '90%', sm: 430 },
            backgroundColor: '#fff',
            borderRadius: 3,
            p: 4,
            textAlign: 'center',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: 24,
            outline: 'none',
          }}
        >
          <Typography sx={{ fontSize: 24, fontWeight: 1000, mb: 1.5 }}>
            {warningTitle}
          </Typography>

          <Typography sx={{ color: '#666', fontWeight: 700, mb: 4 }}>
            {warningMessage}
          </Typography>

          <Button
            onClick={() => setWarningOpen(false)}
            sx={{
              backgroundColor: '#f4b400',
              color: '#111',
              px: 5,
              py: 1.2,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 900,
              '&:hover': { backgroundColor: '#e0a800' },
            }}
          >
            OK
          </Button>
        </Box>
      </Modal>

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
            href="/myAppointments"
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
    </Box>
  );
}
