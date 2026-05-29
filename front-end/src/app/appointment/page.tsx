'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
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
    </Box>
  );
}