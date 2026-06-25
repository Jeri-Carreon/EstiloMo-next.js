'use client';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import type { AppointmentData } from '@/app/appointment/page';

const steps = ['Barber', 'Service', 'Schedule', 'Cart', 'Confirmation'];

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface AvailableTime {
  startMinutes: number;
  endMinutes: number;
  label: string;
}

interface ScheduleStepProps {
  appointmentData: AppointmentData;
  setAppointmentData: React.Dispatch<React.SetStateAction<AppointmentData>>;
  nextStep: (
    appointmentDate: string,
    startMinutes: number,
    endMinutes: number
  ) => void;
  prevStep: () => void;
  cartCount: number;
  onCartClick: () => void;
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalHour = hour % 12 || 12;

  return `${normalHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export default function ScheduleStep({
  appointmentData,
  nextStep,
  prevStep,
  cartCount,
  onCartClick,
}: ScheduleStepProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<AvailableTime | null>(null);
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [bookingCutoffHours, setBookingCutoffHours] = useState<number>(1);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(
    new Set()
  );

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) cells.push(null);

    for (let day = 1; day <= totalDays; day++) {
      cells.push(new Date(year, month, day));
    }

    return cells;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const handleNext = () => {
    if (!selectedDate || !selectedTime) return;

    const appointmentDate = formatDateInput(selectedDate);

    nextStep(
      appointmentDate,
      selectedTime.startMinutes,
      selectedTime.endMinutes
    );
  };

  const fetchAvailability = async (date: Date) => {
    if (!appointmentData.barberId || !appointmentData.serviceId) {
      setAvailableTimes([]);
      return;
    }

    try {
      setLoadingTimes(true);
      setAvailableTimes([]);

      const formattedDate = formatDateInput(date);

      const blockedSlots = appointmentData.cartItems
        .filter(
          (item) =>
            item.barberId === appointmentData.barberId &&
            item.appointmentDate === formattedDate
        )
        .map((item) => `${item.startMinutes}-${item.endMinutes}`)
        .join(',');

      const response = await fetch(
        `/api/admin/barbers/availability?barberId=${appointmentData.barberId}&serviceId=${appointmentData.serviceId}&date=${formattedDate}&blockedSlots=${blockedSlots}`
      );

      const data = await response.json();

      setAvailableTimes(data?.availableTimes ?? []);
      setSelectedTime(null);
    } catch (error) {
      console.error(error);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  const fetchUnavailableDates = async (month: Date) => {
    if (!appointmentData.barberId) {
      setUnavailableDates(new Set());
      return;
    }

    try {
      const year = month.getFullYear();
      const m = String(month.getMonth() + 1).padStart(2, '0');

      const response = await fetch(
        `/api/admin/barbers/unavailable-dates?barberId=${appointmentData.barberId}&year=${year}&month=${m}`
      );

      const data = await response.json();
      setUnavailableDates(new Set(data?.unavailableDates ?? []));
    } catch (error) {
      console.error(error);
      setUnavailableDates(new Set());
    }
  };

  useEffect(() => {
    if (!selectedDate) return;

    fetchAvailability(selectedDate);
  }, [selectedDate, appointmentData.barberId, appointmentData.serviceId]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/appointments/settings');
        const data = await res.json();

        setBookingCutoffHours(data?.bookingCutoffHours ?? 1);
      } catch {
        setBookingCutoffHours(1);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    fetchUnavailableDates(currentMonth);
  }, [currentMonth, appointmentData.barberId]);

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
            const completed = index < 2;
            const active = index === 2;

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
                    backgroundColor:
                      completed || active ? '#f4b400' : '#777',
                    color: completed || active ? '#000' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: { xs: 12, md: 14 },
                  }}
                >
                  {index + 1}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            sx={{ fontWeight: 900, fontSize: { xs: 28, sm: 34 }, color: '#111' }}
          >
            Schedule
          </Typography>

          <IconButton
            onClick={onCartClick}
            disabled={cartCount === 0}
            sx={{
              backgroundColor: '#fff',
              borderRadius: '50%',
              width: 48,
              height: 48,
              position: 'relative',
              '&:hover': { backgroundColor: '#f5f5f5' },
              '&.Mui-disabled': {
                backgroundColor: '#ddd',
                color: '#999',
              },
            }}
          >
            <ShoppingCartIcon sx={{ color: cartCount === 0 ? '#999' : '#111' }} />

            <Badge
              badgeContent={cartCount}
              color="error"
              sx={{
                position: 'absolute',
                top: 5,
                right: 5,
                '& .MuiBadge-badge': {
                  fontWeight: 900,
                  fontSize: 11,
                  minWidth: 18,
                  height: 18,
                },
              }}
            />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: { xs: 2, md: 3 },
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: { xs: '100%', sm: 390 },
                maxWidth: '100%',
                mx: { xs: 'auto', lg: 0 },
              }}
            >
              <Stack
                direction="row"
                spacing={{ xs: 0.5, sm: 1 }}
                sx={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <IconButton
                  size="small"
                  onClick={handlePrevMonth}
                  sx={{
                    backgroundColor: '#fff',
                    border: '1px solid #d0d0d0',
                    '&:hover': { backgroundColor: '#f5f5f5' },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>

                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.1rem', sm: '1.5rem' },
                    textAlign: 'center',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  {currentMonth.toLocaleString('default', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Typography>

                <IconButton
                  size="small"
                  onClick={handleNextMonth}
                  sx={{
                    backgroundColor: '#fff',
                    border: '1px solid #d0d0d0',
                    '&:hover': { backgroundColor: '#f5f5f5' },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Stack>

              <Box sx={{ border: '1px solid #7b7b7b', backgroundColor: '#fff' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                  }}
                >
                  {weekdays.map((day) => (
                    <Box
                      key={day}
                      sx={{
                        borderRight: '1px solid #7b7b7b',
                        borderBottom: '1px solid #7b7b7b',
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: { xs: 9, sm: 10 },
                        fontWeight: 700,
                        '&:last-child': { borderRight: 'none' },
                      }}
                    >
                      {day.slice(0, 3)}
                    </Box>
                  ))}
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                  }}
                >
                  {days.map((date, index) => {
                    const day = date?.getDate();

                    const cutoffDate = new Date();
                    cutoffDate.setHours(
                      cutoffDate.getHours() + bookingCutoffHours
                    );
                    cutoffDate.setHours(0, 0, 0, 0);

                    const formattedDate = date ? formatDateInput(date) : '';
                    const isPastDate = date ? date < cutoffDate : false;
                    const isUnavailable =
                      !!date && unavailableDates.has(formattedDate);

                    const isAvailable = !!day && !isPastDate && !isUnavailable;

                    const isSelected =
                      selectedDate &&
                      date &&
                      selectedDate.toDateString() === date.toDateString();

                    return (
                      <Box
                        key={index}
                        onClick={() => {
                          if (date && isAvailable) {
                            setSelectedDate(date);
                          }
                        }}
                        sx={{
                          height: { xs: 46, sm: 58, md: 68 },
                          borderRight: '1px solid #7b7b7b',
                          borderBottom: '1px solid #7b7b7b',
                          position: 'relative',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          backgroundColor:
                            isPastDate || isUnavailable
                              ? '#e1e1e1'
                              : isSelected
                              ? '#d9d9d9'
                              : '#efefef',
                          opacity: isPastDate || isUnavailable ? 0.5 : 1,
                          '&:nth-of-type(7n)': { borderRight: 'none' },
                        }}
                      >
                        {day && (
                          <>
                            <Typography
                              sx={{
                                position: 'absolute',
                                top: { xs: 5, sm: 8 },
                                right: { xs: 5, sm: 8 },
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: { xs: 12, sm: 14 },
                                color: '#555',
                              }}
                            >
                              {day}
                            </Typography>

                            {isAvailable && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: 4,
                                  left: 4,
                                  right: 4,
                                  height: { xs: 6, sm: 8 },
                                  borderRadius: 5,
                                  backgroundColor: '#39d000',
                                }}
                              />
                            )}
                          </>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                border: '1px solid #7b7b7b',
                backgroundColor: '#efefef',
                minHeight: { xs: 320, md: 430, lg: 530 },
              }}
            >
              <Box sx={{ borderBottom: '1px solid #7b7b7b', py: 2 }}>
                <Typography
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  }}
                >
                  Time
                </Typography>
              </Box>

              <Box sx={{ py: 3 }}>
                <Typography
                  align="center"
                  sx={{
                    fontSize: { xs: '1.35rem', sm: '2rem' },
                    fontWeight: 500,
                    px: 2,
                  }}
                >
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Select a date'}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 2,
                  px: { xs: 2, sm: 3 },
                  pb: 3,
                }}
              >
                {loadingTimes && (
                  <Typography sx={{ width: '100%', textAlign: 'center' }}>
                    Loading times...
                  </Typography>
                )}

                {!loadingTimes && selectedDate && availableTimes.length === 0 && (
                  <Typography sx={{ width: '100%', textAlign: 'center' }}>
                    No available times.
                  </Typography>
                )}

                {availableTimes.map((time) => {
                  const selected =
                    selectedTime?.startMinutes === time.startMinutes;

                  const label =
                    time.label ||
                    `${formatTime(time.startMinutes)} - ${formatTime(
                      time.endMinutes
                    )}`;

                  return (
                    <Button
                      key={`${time.startMinutes}-${time.endMinutes}`}
                      onClick={() =>
                        setSelectedTime({
                          startMinutes: time.startMinutes,
                          endMinutes: time.endMinutes,
                          label,
                        })
                      }
                      variant="outlined"
                      sx={{
                        minWidth: { xs: '100%', sm: 180 },
                        height: 48,
                        borderRadius: 2,
                        border: selected
                          ? '2px solid #000'
                          : '1px solid #d5d5d5',
                        backgroundColor: selected ? '#fff' : '#d9d9d9',
                        color: '#000',
                        fontWeight: 700,
                        textTransform: 'none',
                        '&:hover': {
                          border: '2px solid #000',
                          backgroundColor: '#fff',
                        },
                      }}
                    >
                      {label}
                    </Button>
                  );
                })}
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
            onClick={handleNext}
            disabled={!selectedTime}
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
            Next
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
