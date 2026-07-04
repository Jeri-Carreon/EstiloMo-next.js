'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent,Session, } from "@supabase/supabase-js";

import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';

import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

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

interface ConfirmAppointmentResponse {
  error?: string;
  checkoutUrl?: string;
  saleId?: string;
  saleCode?: string;
  checkoutSessionId?: string;
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

function isSameCartItem(first: CartItem, second: CartItem) {
  return (
    first.barberId === second.barberId &&
    first.serviceId === second.serviceId &&
    first.appointmentDate === second.appointmentDate &&
    first.startMinutes === second.startMinutes &&
    first.endMinutes === second.endMinutes
  );
}

export default function AppointmentPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
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

  const totalPrice = appointmentData.cartItems.reduce(
    (sum, item) => sum + item.servicePrice,
    0
  );

  const downPayment = 150;

  useEffect(() => {
    const supabase = createClient();

    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login?redirect=/appointment');
        return;
      }

      setCheckingAuth(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (
        event: AuthChangeEvent,
        session: Session | null
      ) => {
        if (event === "SIGNED_OUT" || !session) {
          router.replace("/login?redirect=/appointment");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const showWarning = (title: string, message: string) => {
    setWarningTitle(title);
    setWarningMessage(message);
    setWarningOpen(true);
  };

  const showBookedConfirmation = () => {
    window.localStorage.removeItem('estilomoPendingCheckout');
    setSuccessOpen(true);
    setAppointmentData({
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
  };

  const PENDING_CHECKOUT_EXPIRATION_MS = 15 * 60 * 1000;

  const persistPendingCheckout = (
    saleId: string,
    saleCode: string,
    checkoutUrl: string
  ) => {
    window.localStorage.setItem(
      'estilomoPendingCheckout',
      JSON.stringify({
        saleId,
        saleCode,
        checkoutUrl,
        appointmentData,
        expiresAt: Date.now() + PENDING_CHECKOUT_EXPIRATION_MS,
      })
    );
  };

  const getPendingCheckout = () => {
    try {
      const raw = window.localStorage.getItem('estilomoPendingCheckout');

      if (!raw) {
        return {
          saleId: '',
          saleCode: '',
          checkoutUrl: '',
          appointmentData: null as AppointmentData | null,
          expiresAt: 0,
        };
      }

      const parsed = JSON.parse(raw) as {
        saleId?: string;
        saleCode?: string;
        checkoutUrl?: string;
        appointmentData?: AppointmentData;
        expiresAt?: number;
      };

      return {
        saleId: parsed.saleId || '',
        saleCode: parsed.saleCode || '',
        checkoutUrl: parsed.checkoutUrl || '',
        appointmentData: parsed.appointmentData || null,
        expiresAt: Number(parsed.expiresAt || 0),
      };
    } catch {
      return {
        saleId: '',
        saleCode: '',
        checkoutUrl: '',
        appointmentData: null as AppointmentData | null,
        expiresAt: 0,
      };
    }
  };

  const nextStep = (
    appointmentDate?: string,
    startMinutes?: number,
    endMinutes?: number
  ) => {
    if (currentStep === 2 && appointmentDate) {
      const nextCartItem: CartItem = {
        barberId: appointmentData.barberId,
        barberName: appointmentData.barberName,
        serviceId: appointmentData.serviceId,
        serviceName: appointmentData.serviceName,
        servicePrice: appointmentData.servicePrice,
        serviceDescription: appointmentData.serviceDescription,
        serviceDurationMinutes: appointmentData.serviceDurationMinutes,
        appointmentDate,
        startMinutes: startMinutes ?? 0,
        endMinutes: endMinutes ?? 0,
      };

      setAppointmentData((prev) => {
        const existingIndex = prev.cartItems.findIndex(
          (item) => isSameCartItem(item, nextCartItem)
        );

        const updatedCartItems = [...prev.cartItems];

        if (existingIndex >= 0) {
          updatedCartItems[existingIndex] = nextCartItem;
        } else {
          updatedCartItems.push(nextCartItem);
        }

        return {
          ...prev,
          cartItems: updatedCartItems,
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
        };
      });
    }

    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (currentStep === 3) {
      const lastItem =
        appointmentData.cartItems[appointmentData.cartItems.length - 1];

      if (!lastItem) {
        setCurrentStep(0);
        return;
      }

      setAppointmentData((prev) => ({
        ...prev,
        barberId: lastItem.barberId,
        barberName: lastItem.barberName,
        serviceId: lastItem.serviceId,
        serviceName: lastItem.serviceName,
        servicePrice: lastItem.servicePrice,
        serviceDescription: lastItem.serviceDescription,
        serviceDurationMinutes: lastItem.serviceDurationMinutes,
        appointmentDate: lastItem.appointmentDate,
        startMinutes: lastItem.startMinutes,
        endMinutes: lastItem.endMinutes,
      }));
    }

    setCurrentStep((prev) => Math.max(prev - 1, 0));
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

    const nextCartItem: CartItem = {
      barberId: appointmentData.barberId,
      barberName: appointmentData.barberName,
      serviceId: appointmentData.serviceId,
      serviceName: appointmentData.serviceName,
      servicePrice: appointmentData.servicePrice,
      serviceDescription: appointmentData.serviceDescription,
      serviceDurationMinutes: appointmentData.serviceDurationMinutes,
      appointmentDate: appointmentData.appointmentDate ?? '',
      startMinutes: appointmentData.startMinutes ?? 0,
      endMinutes: appointmentData.endMinutes ?? 0,
    };

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
        nextCartItem,
      ],
    }));

    setCurrentStep(0);
  };

  const goToBarberStep = () => {
    setAppointmentData((prev) => ({
      ...prev,
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
    }));

    setCurrentStep(0);
  };

  const handleConfirm = async () => {
    if (appointmentData.cartItems.length === 0) {
      showWarning('Empty Cart', 'Your cart is empty.');
      return;
    }

    const paymentMethods = ['card', 'gcash', 'qrph'];

    try {
      setLoading(true);

      const res = await fetch('/api/appointment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          downPayment,
          totalPrice,
          cartItems: appointmentData.cartItems,
          paymentMethods,
        }),
      });

      const text = await res.text();

      let data: ConfirmAppointmentResponse = {};

      try {
        data = JSON.parse(text);
      } catch {
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

      if (!data.checkoutUrl || !data.saleId || !data.saleCode) {
        showWarning(
          'Checkout Failed',
          'PayMongo did not return a checkout session.'
        );
        return;
      }

      persistPendingCheckout(data.saleId, data.saleCode, data.checkoutUrl);
      window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      showWarning(
        'Checkout Opened',
        'Your PayMongo checkout was opened in a new tab. Please complete payment there. This page will keep your booking pending.'
      );
    } catch (error) {
      console.error(error);
      showWarning('Something Went Wrong', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkingAuth) return;
    if (typeof window === 'undefined') return;

    const runPageLogic = async () => {
      const currentUrl = new URL(window.location.href);
      const paymentResult = currentUrl.searchParams.get('payment');
      const pendingCheckout = getPendingCheckout();

      const saleId =
        currentUrl.searchParams.get('saleId') || pendingCheckout.saleId;
      const saleCode =
        currentUrl.searchParams.get('saleCode') || pendingCheckout.saleCode;

      const restorePendingCheckout = (title: string, message: string) => {
        window.history.replaceState({}, '', '/appointment');

        window.setTimeout(() => {
          if (pendingCheckout.appointmentData) {
            setAppointmentData(pendingCheckout.appointmentData);
          }

          setCurrentStep(4);
          showWarning(title, message);
        }, 0);
      };

      if (paymentResult === 'success' && (saleId || saleCode)) {
        window.history.replaceState({}, '', '/appointment');

        const timer = window.setInterval(async () => {
          try {
            const params = new URLSearchParams();

            if (saleId) params.set('saleId', saleId);
            if (saleCode) params.set('saleCode', saleCode);

            params.set('confirmReturn', '1');

            const res = await fetch(`/api/appointment/payment-status?${params}`);
            const data = await res.json();

            if (res.ok && data.isScheduled) {
              window.clearInterval(timer);
              showBookedConfirmation();
            }
          } catch (error) {
            console.error(error);
          }
        }, 2000);

        return () => window.clearInterval(timer);
      }

      const expiresAt = pendingCheckout.expiresAt || 0;
      const now = Date.now();
      const hasPendingCheckout = Boolean(
        pendingCheckout.saleId || pendingCheckout.saleCode
      );

      if (!paymentResult && hasPendingCheckout && expiresAt && now >= expiresAt) {
        const params = new URLSearchParams();
        if (saleId) params.set('saleId', saleId);
        if (saleCode) params.set('saleCode', saleCode);
        params.set('payment', 'expired');

        try {
          await fetch(`/api/appointment/payment-status?${params}`);
        } catch (error) {
          console.error(error);
        }

        restorePendingCheckout(
          'Payment Not Completed',
          'Your checkout session expired. Your booking details are still saved, so you can try again.'
        );
        return;
      }

      if (
        (paymentResult === 'failed' || paymentResult === 'expired') &&
        (saleId || saleCode)
      ) {
        const isExpired = now >= expiresAt;

        if (isExpired) {
          window.history.replaceState({}, '', '/appointment');

          const params = new URLSearchParams();
          if (saleId) params.set('saleId', saleId);
          if (saleCode) params.set('saleCode', saleCode);
          params.set('payment', paymentResult);

          try {
            await fetch(`/api/appointment/payment-status?${params}`);
          } catch (error) {
            console.error(error);
          }
        }

        restorePendingCheckout(
          'Payment Not Completed',
          'Your payment was cancelled, failed, or expired. Your booking details are still saved, so you can try again.'
        );
      }

      if (paymentResult === 'cancel') {
        restorePendingCheckout(
          'Payment Cancelled',
          'Your payment was not completed. Your booking details are still saved, so you can try again.'
        );
      }

      if (paymentResult === 'failed') {
        restorePendingCheckout(
          'Payment Failed',
          'Your payment did not go through. Your booking details are still saved, so you can try again.'
        );
      }

      if (paymentResult === 'expired') {
        restorePendingCheckout(
          'Payment Not Completed',
          'Your payment was cancelled, failed, or expired. Your booking details are still saved, so you can try again.'
        );
      }
    };

    runPageLogic();
  }, [checkingAuth]);

  if (checkingAuth) {
    return null;
  }

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
          goToBarberStep={goToBarberStep}
        />
      )}

      {currentStep === 4 && (
        <ConfirmationStep
          appointmentData={appointmentData}
          prevStep={prevStep}
          totalPrice={totalPrice}
          downPayment={downPayment}
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
              top: { xs: 72, sm: 96 },
              bottom: { xs: 72, sm: 88 },
              height: 'auto',
              width: { xs: 'calc(100vw - 24px)', sm: 410 },
              maxWidth: '100vw',
              borderRadius: { xs: '12px 0 0 12px', sm: '16px 0 0 16px' },
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box
          sx={{
            height: '100%',
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 900 }}>
              Your Booking Cart
            </Typography>

            <IconButton
              onClick={() => setCartOpen(false)}
              sx={{
                color: '#555',
                border: '1px solid #ddd',
                width: 38,
                height: 38,
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {appointmentData.cartItems.length === 0 ? (
            <Typography sx={{ color: '#666' }}>Your cart is empty.</Typography>
          ) : (
            <>
              <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
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
                    <Typography>
                      Duration: {item.serviceDurationMinutes} mins
                    </Typography>
                    <Typography>Date: {formatDate(item.appointmentDate)}</Typography>
                    <Typography>
                      Time: {formatTime(item.startMinutes)} -{' '}
                      {formatTime(item.endMinutes)}
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
            width: { xs: 'calc(100% - 32px)', sm: 430 },
            maxWidth: 430,
            backgroundColor: '#fff',
            borderRadius: 3,
            p: { xs: 3, sm: 4 },
            textAlign: 'center',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: 24,
            outline: 'none',
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: 21, sm: 24 },
              fontWeight: 1000,
              mb: 1.5,
            }}
          >
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
            }}
          >
            OK
          </Button>
        </Box>
      </Modal>

      <Modal open={successOpen}>
        <Box
          sx={{
            width: { xs: 'calc(100% - 32px)', md: 720 },
            maxWidth: 720,
            maxHeight: '90vh',
            overflowY: 'auto',
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
              width: { xs: 86, sm: 115 },
              height: { xs: 86, sm: 115 },
              backgroundColor: '#f1f1f1',
              borderRadius: '50%',
              mx: 'auto',
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircleIcon
              sx={{ fontSize: { xs: 54, sm: 70 }, color: '#2ebd4f' }}
            />
          </Box>

          <Typography
            sx={{
              fontSize: { xs: 24, sm: 30, md: 40 },
              fontWeight: 1000,
              color: '#09a84f',
              lineHeight: 1.1,
              mb: 2,
            }}
          >
            APPOINTMENT BOOKED SUCCESSFULLY!
          </Typography>

          <Typography
            sx={{ fontWeight: 900, fontSize: { xs: 16, sm: 18 }, mb: 4 }}
          >
            We will notify you when your appointment is confirmed by our
            receptionist.
          </Typography>

          <Typography
            sx={{ fontWeight: 900, fontSize: { xs: 16, sm: 18 }, mb: 5 }}
          >
            Thank you for trusting The Barbs Bro!
          </Typography>

          <Button
            href="/myAppointments"
            sx={{
              backgroundColor: '#ddd',
              color: '#111',
              width: { xs: '100%', sm: 'auto' },
              px: { xs: 2, sm: 6 },
              py: 1.5,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 900,
              fontSize: { xs: 16, sm: 20 },
            }}
          >
            View Appointments
          </Button>
        </Box>
      </Modal>
    </Box>
  );
}
