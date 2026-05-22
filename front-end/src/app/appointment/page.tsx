'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BarberStep from '@/components/appointment/BarberStep';

export interface AppointmentData {
  barberId: string;
  barberName: string;
}

export default function AppointmentPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const [appointmentData, setAppointmentData] =
    useState<AppointmentData>({
      barberId: '',
      barberName: '',
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
      <Footer />
    </Box>
  );
}