'use client';

import { useEffect, useState } from 'react';

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

type PaymentType = 'card' | 'ewallet';
type EWalletProvider = 'gcash' | 'grabpay' | 'maya' | '';

function getPayMongoPaymentMethods(
  paymentType: PaymentType,
  eWalletProvider: EWalletProvider
) {
  if (paymentType === 'card') return ['card'];
  if (eWalletProvider === 'gcash') return ['gcash'];
  if (eWalletProvider === 'maya') return ['qrph'];

  return [];
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
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>('card');
  const [eWalletProvider, setEWalletProvider] =
    useState<EWalletProvider>('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [checkoutSaleId, setCheckoutSaleId] = useState('');
  const [checkoutSaleCode, setCheckoutSaleCode] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentChecking, setPaymentChecking] = useState(false);

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

  const showBookedConfirmation = () => {
    window.localStorage.removeItem('estilomoPendingCheckout');
    setCheckoutOpen(false);
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

  const persistPendingCheckout = (saleId: string, saleCode: string) => {
    window.localStorage.setItem(
      'estilomoPendingCheckout',
      JSON.stringify({ saleId, saleCode })
    );
  };

  const getPendingCheckout = () => {
    try {
      const raw = window.localStorage.getItem('estilomoPendingCheckout');
      if (!raw) return { saleId: '', saleCode: '' };

      const parsed = JSON.parse(raw) as {
        saleId?: string;
        saleCode?: string;
      };

      return {
        saleId: parsed.saleId || '',
        saleCode: parsed.saleCode || '',
      };
    } catch {
      return { saleId: '', saleCode: '' };
    }
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

    const paymentMethods = getPayMongoPaymentMethods(
      paymentType,
      eWalletProvider
    );

    if (paymentMethods.length === 0) {
      showWarning('Payment Method Required', 'Please select a payment method.');
      return;
    }

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

      if (!data.checkoutUrl || !data.saleId || !data.saleCode) {
        showWarning(
          'Checkout Failed',
          'PayMongo did not return a checkout session.'
        );
        return;
      }

      setCheckoutUrl(data.checkoutUrl);
      setCheckoutSaleId(data.saleId);
      setCheckoutSaleCode(data.saleCode);
      persistPendingCheckout(data.saleId, data.saleCode);
      setCheckoutOpen(true);
    } catch (error) {
      console.error(error);
      showWarning('Something Went Wrong', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (
    saleIdOverride?: string,
    showPendingWarning = true,
    saleCodeOverride?: string
  ) => {
    const pendingCheckout = getPendingCheckout();
    const saleIdToCheck =
      saleIdOverride || checkoutSaleId || pendingCheckout.saleId;
    const saleCodeToCheck =
      saleCodeOverride || checkoutSaleCode || pendingCheckout.saleCode;

    if (!saleIdToCheck && !saleCodeToCheck) return;

    try {
      setPaymentChecking(true);

      const params = new URLSearchParams();
      if (saleIdToCheck) params.set('saleId', saleIdToCheck);
      if (saleCodeToCheck) params.set('saleCode', saleCodeToCheck);

      const res = await fetch(`/api/appointment/payment-status?${params}`);
      const data = await res.json();

      if (!res.ok) {
        showWarning(
          'Payment Check Failed',
          data.error || 'Failed to check payment status.'
        );
        return;
      }

      if (data.isScheduled) {
        showBookedConfirmation();
      } else if (showPendingWarning) {
        showWarning(
          'Payment Pending',
          'Your downpayment is still being confirmed. Please wait a moment, then check again.'
        );
      }
    } catch (error) {
      console.error(error);
      showWarning('Something Went Wrong', 'Something went wrong.');
    } finally {
      setPaymentChecking(false);
    }
  };

  useEffect(() => {
    if (!checkoutOpen || !checkoutSaleId) return;

    const timer = window.setInterval(async () => {
      try {
        const params = new URLSearchParams({
          saleId: checkoutSaleId,
          saleCode: checkoutSaleCode,
        });

        const res = await fetch(`/api/appointment/payment-status?${params}`);
        const data = await res.json();

        if (res.ok && data.isScheduled) {
          window.clearInterval(timer);
          showBookedConfirmation();
        }
      } catch (error) {
        console.error(error);
      }
    }, 4000);

    return () => window.clearInterval(timer);
  }, [checkoutOpen, checkoutSaleId, checkoutSaleCode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = new URL(window.location.href);
    const paymentResult = currentUrl.searchParams.get('payment');
    const pendingCheckout = getPendingCheckout();
    const saleId =
      currentUrl.searchParams.get('saleId') || pendingCheckout.saleId;
    const saleCode =
      currentUrl.searchParams.get('saleCode') || pendingCheckout.saleCode;

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

    if (paymentResult === 'cancel') {
      window.history.replaceState({}, '', '/appointment');
      window.setTimeout(() => {
        showWarning(
          'Payment Cancelled',
          'Your PayMongo downpayment was not completed.'
        );
      }, 0);
    }
  }, []);

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
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          eWalletProvider={eWalletProvider}
          setEWalletProvider={setEWalletProvider}
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
            <Typography
              sx={{
                fontSize: { xs: 20, sm: 24 },
                fontWeight: 900,
              }}
            >
              Your Booking Cart
            </Typography>

            <IconButton
              onClick={() => setCartOpen(false)}
              sx={{
                color: '#555',
                border: '1px solid #ddd',
                width: 38,
                height: 38,
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

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
          <Typography sx={{ fontSize: { xs: 21, sm: 24 }, fontWeight: 1000, mb: 1.5 }}>
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
            <CheckCircleIcon sx={{ fontSize: { xs: 54, sm: 70 }, color: '#2ebd4f' }} />
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

          <Typography sx={{ fontWeight: 900, fontSize: { xs: 16, sm: 18 }, mb: 4 }}>
            We will notify you when your appointment is confirmed by our receptionist.
          </Typography>

          <Typography sx={{ fontWeight: 900, fontSize: { xs: 16, sm: 18 }, mb: 5 }}>
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
              boxShadow: '0 3px 5px rgba(0,0,0,0.2)',
            }}
          >
            View Appointments
          </Button>
        </Box>
      </Modal>

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)}>
        <Box
          sx={{
            width: { xs: 'calc(100% - 20px)', md: 'min(960px, 92vw)' },
            height: { xs: '88vh', md: '86vh' },
            backgroundColor: '#fff',
            borderRadius: 2,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: 24,
            outline: 'none',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #ddd',
              gap: 2,
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 18, sm: 22 } }}>
              PayMongo Downpayment
            </Typography>

            <IconButton onClick={() => setCheckoutOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              flex: 1,
              p: { xs: 3, sm: 5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              gap: 2,
              backgroundColor: '#f7f7f7',
            }}
          >
            <Typography sx={{ fontWeight: 1000, fontSize: { xs: 24, sm: 32 } }}>
              Continue to PayMongo
            </Typography>

            <Typography
              sx={{
                color: '#666',
                fontWeight: 700,
                maxWidth: 520,
                lineHeight: 1.6,
              }}
            >
              PayMongo does not allow this checkout to load inside an embedded
              frame. Continue in this tab, then you will return here after the
              downpayment is confirmed.
            </Typography>
          </Box>

          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1.5,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 1.5,
              borderTop: '1px solid #ddd',
            }}
          >
            <Typography sx={{ color: '#666', fontWeight: 700, fontSize: 13 }}>
              Keep this payment window open until PayMongo finishes redirecting.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  if (checkoutUrl) {
                    window.location.href = checkoutUrl;
                  }
                }}
                sx={{
                  backgroundColor: '#ddd',
                  color: '#111',
                  borderRadius: 10,
                  px: 2.5,
                  textTransform: 'none',
                  fontWeight: 900,
                }}
              >
                Continue to Secure Checkout
              </Button>

              <Button
                onClick={() => {
                  void checkPaymentStatus();
                }}
                disabled={paymentChecking}
                sx={{
                  backgroundColor: '#f4b400',
                  color: '#111',
                  borderRadius: 10,
                  px: 2.5,
                  textTransform: 'none',
                  fontWeight: 900,
                  '&:disabled': {
                    backgroundColor: '#f5dc90',
                    color: '#777',
                  },
                }}
              >
                {paymentChecking ? 'Checking...' : 'I Finished Paying'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
