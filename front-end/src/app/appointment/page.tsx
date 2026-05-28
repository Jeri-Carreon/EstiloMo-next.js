'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
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

export default function AppointmentPage() {
  const [currentStep, setCurrentStep] = useState(0);

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
          }
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
        }
      ],
    }));
    setCurrentStep(0);
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
          <Box sx={{ flex: 1, backgroundColor: '#e5e5e5', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-nunito-sans)', mb: 2 }}>
              Confirmation
            </Typography>
            <Typography sx={{ mb: 4, textAlign: 'center', maxWidth: 500, fontFamily: 'var(--font-nunito-sans)' }}>
              Review your cart before confirming. Use the button below to go back to your cart if you need to make changes.
            </Typography>
            <Button
              variant="contained"
              onClick={prevStep}
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
              Back to Cart
            </Button>
          </Box>
        )}

      <Footer />
    </Box>
  );
}