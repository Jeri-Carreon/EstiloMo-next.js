'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BarberStep from '@/components/appointment/BarberStep';
import ServiceStep from '@/components/appointment/ServiceStep';
import ScheduleStep from '@/components/appointment/ScheduleStep';

export interface AppointmentData {
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDescription: string;
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
    });

  const nextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
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


      <Footer />
    </Box>
  );
}