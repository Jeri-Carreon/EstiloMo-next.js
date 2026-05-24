'use client';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import type { AppointmentData } from '@/app/appointment/page';


const steps = [
  'Barber',
  'Service',
  'Schedule',
  'Cart',
  'Confirmation',
];

interface ScheduleStepProps {
  appointmentData: AppointmentData;

  setAppointmentData: React.Dispatch<
    React.SetStateAction<AppointmentData>
  >;

  nextStep: () => void;

  prevStep: () => void;
}

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

export default function ScheduleStep({
  appointmentData,
  setAppointmentData,
  nextStep,
  prevStep,
}: ScheduleStepProps) {

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);


  const [selectedTime, setSelectedTime,] = useState<AvailableTime | null>( null);

  const [availableTimes, setAvailableTimes,] = useState<AvailableTime[]>([]);
  
  const [loadingTimes, setLoadingTimes] = useState(false);

  const days = useMemo(() => {
    const year =
      currentMonth.getFullYear();

    const month =
      currentMonth.getMonth();

    const firstDay = new Date(
      year,
      month,
      1
    ).getDay();

    const totalDays = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const cells: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      cells.push(
        new Date(year, month, day)
      );
    }

    return cells;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) =>
      new Date(
        prev.getFullYear(),
        prev.getMonth() - 1,
        1
      )
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) =>
      new Date(
        prev.getFullYear(),
        prev.getMonth() + 1,
        1
      )
    );
  };

  const handleNext = () => {
    if (!selectedDate)
      return;
    
    setAppointmentData((prev) => ({
      ...prev,

      appointmentDate:
        `${selectedDate.getFullYear()}-${String(
          selectedDate.getMonth() + 1
        ).padStart(2, '0')}-${String(
          selectedDate.getDate()
        ).padStart(2, '0')}`,

      startMinutes:
        selectedTime?.startMinutes,

      endMinutes:
        selectedTime?.endMinutes,
    }));

    nextStep();
  };

  const fetchAvailability = async (
    date: Date
  ) => {
    try {
      setLoadingTimes(true);

      const formattedDate =
        `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}-${String(
          date.getDate()
        ).padStart(2, '0')}`

      const response = await fetch(
        `/api/admin/barbers/availability?barberId=${appointmentData.barberId}&serviceId=${appointmentData.serviceId}&date=${formattedDate}`
      );

      const data =
        await response.json();

    
      setAvailableTimes(data.availableTimes);
      setSelectedTime(null);
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTimes(false);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;

    fetchAvailability(selectedDate);
  }, [selectedDate]);

  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());

// Fetch barber's days off and absences for the current month
const fetchUnavailableDates = async (month: Date) => {
  try {
    const year = month.getFullYear();
    const m = String(month.getMonth() + 1).padStart(2, '0');

    const response = await fetch(
      `/api/admin/barbers/unavailable-dates?barberId=${appointmentData.barberId}&year=${year}&month=${m}`
    );

    const data = await response.json();
    // Expect: { unavailableDates: ['2025-06-01', '2025-06-15', ...] }
    setUnavailableDates(new Set(data.unavailableDates));
  } catch (error) {
    console.error(error);
  }
};

useEffect(() => {
  fetchUnavailableDates(currentMonth);
}, [currentMonth]);
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
            const active = index === 2;

            return (
              <Stack
                key={step}
                direction="row"
                spacing={2}
                sx={{
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: active
                      ? '#f4b400'
                      : '#777',

                    color: active
                      ? '#000'
                      : '#fff',

                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'center',

                    fontWeight: 'bold',
                  }}
                >
                  {index + 1}
                </Box>

                <Typography
                  sx={{
                    color: active
                      ? '#fff'
                      : '#aaa',

                    fontWeight: active
                      ? 'bold'
                      : 'normal',

                    fontFamily:
                      'var(--font-nunito-sans)',
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
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            borderBottom:
              '1px solid #bcbcbc',

            px: 4,
            py: 2.5,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',

              fontFamily:
                'var(--font-nunito-sans)',
            }}
          >
            Schedule
          </Typography>
        </Box>

        {/* CONTENT */}
        <Box sx={{ p: 4 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 3,
            }}
          >
            {/* CALENDAR */}
            <Box
              sx={{
                width: 390,
              }}
            >
              {/* MONTH */}
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  justifyContent:
                    'center',

                  alignItems: 'center',

                  mb: 2,
                }}
              >
                <IconButton
                  size="small"
                  onClick={handlePrevMonth}
                  sx={{
                    backgroundColor:
                      '#fff',

                    border:
                      '1px solid #d0d0d0',

                    '&:hover': {
                      backgroundColor:
                        '#f5f5f5',
                    },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>

                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.5rem',

                    fontFamily:
                      'var(--font-nunito-sans)',
                  }}
                >
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Typography>

                <IconButton
                  size="small"
                  onClick={handleNextMonth}
                  sx={{
                    backgroundColor:
                      '#fff',

                    border:
                      '1px solid #d0d0d0',

                    '&:hover': {
                      backgroundColor:
                        '#f5f5f5',
                    },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Stack>

              {/* GRID */}
              <Box
                sx={{
                  border:
                    '1px solid #7b7b7b',

                  backgroundColor:
                    '#fff',
                }}
              >
                {/* WEEKDAYS */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(7, 1fr)',
                  }}
                >
                  {weekdays.map((day) => (
                    <Box
                      key={day}
                      sx={{
                        borderRight:
                          '1px solid #7b7b7b',

                        borderBottom:
                          '1px solid #7b7b7b',

                        height: 50,

                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          'center',

                        fontSize: 10,
                        fontWeight: 700,

                        '&:last-child': {
                          borderRight:
                            'none',
                        },
                      }}
                    >
                      {day}
                    </Box>
                  ))}
                </Box>

                {/* DAYS */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(7, 1fr)',
                  }}
                >
                  {days.map((date, index) => {
                    const day = date?.getDate();

                    const today = new Date();

                    today.setHours(0, 0, 0, 0);

                    const formattedDate =
                      date
                        ? `${date.getFullYear()}-${String(
                            date.getMonth() + 1
                          ).padStart(2, '0')}-${String(
                            date.getDate()
                          ).padStart(2, '0')}`
                        : '';


                    const isPastDate = date ? date < today: false;

                    const isUnavailable = !!date && unavailableDates.has(formattedDate);

                    const isAvailable = 
                      !!day && 
                      !isPastDate &&
                      !isUnavailable;


                    const isSelected =
                      selectedDate &&
                      date &&
                      selectedDate.toDateString() === date.toDateString();

                    return (
                      <Box
                        key={index}
                        onClick={() => {
                          if (date && !isPastDate && !isUnavailable) {
                            setSelectedDate(date);
                          }
                        }}
                        sx={{
                          height: 68,

                          borderRight:
                            '1px solid #7b7b7b',

                          borderBottom:
                            '1px solid #7b7b7b',

                          position:
                            'relative',

                          cursor:
                            day &&
                            isAvailable &&
                            !isUnavailable
                              ? 'pointer'
                              : 'not-allowed',

                          backgroundColor:
                            isPastDate || isUnavailable
                              ? '#e1e1e1'
                              : isSelected
                              ? '#d9d9d9'
                              : '#efefef',

                          opacity: isPastDate || isUnavailable ? 0.5 : 1,

                          '&:nth-of-type(7n)': {
                            borderRight:
                              'none',
                          },
                        }}
                      >
                        {day && (
                          <>
                            <Typography
                              sx={{
                                position:
                                  'absolute',

                                top: 8,
                                right: 8,

                                fontWeight:
                                  isSelected
                                    ? 700
                                    : 500,

                                color:
                                  '#555',

                                fontFamily:
                                  'var(--font-nunito-sans)',
                              }}
                            >
                              {day}
                            </Typography>

                            {isAvailable && (
                              <Box
                                sx={{
                                  position:
                                    'absolute',

                                  bottom: 4,
                                  left: 4,
                                  right: 4,

                                  height: 8,

                                  borderRadius: 5,

                                  backgroundColor:
                                    '#39d000',
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

            {/* TIME PANEL */}
            <Box
              sx={{
                flex: 1,

                border:
                  '1px solid #7b7b7b',

                backgroundColor:
                  '#efefef',

                minHeight: 530,
              }}
            >
              {/* TITLE */}
              <Box
                sx={{
                  borderBottom:
                    '1px solid #7b7b7b',

                  py: 2,
                }}
              >
                <Typography
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.5rem',

                    fontFamily:
                      'var(--font-nunito-sans)',
                  }}
                >
                  Time
                </Typography>
              </Box>

              {/* DATE */}
              <Box sx={{ py: 3 }}>
                <Typography
                  align="center"
                  sx={{
                    fontSize: '2rem',

                    fontWeight: 500,

                    fontFamily:
                      'var(--font-nunito-sans)',
                  }}
                >
                  {selectedDate
                    ? selectedDate.toLocaleDateString(
                        'en-US',
                        {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        }
                      )
                    : 'Select a date'
                  }
                </Typography>
              </Box>

              {/* TIMES */}
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',

                  justifyContent:
                    'center',

                  gap: 2,

                  px: 3,
                }}
              >

                {loadingTimes && (
                  <Typography
                    sx={{
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    Loading times...
                  </Typography>
                )}
                {!loadingTimes &&
                  selectedDate &&
                  availableTimes.length === 0 && (
                    <Typography
                      sx={{
                        width: '100%',
                        textAlign: 'center',
                      }}
                    >
                      No available times.
                    </Typography>
                  )}

                {availableTimes.map(
                  (time) => {
                    const selected =
                      selectedTime?.startMinutes ===
                      time.startMinutes;
                    return (
                      <Button
                        key={time.label}
                        disabled={false}
                        
                        onClick={() =>
                          setSelectedTime(time)
                        }
                        variant="outlined"
                        sx={{
                          minWidth: 180,
                          height: 48,

                          borderRadius: 2,

                          border:
                            selected
                              ? '2px solid #000'
                              : '1px solid #d5d5d5',

                          backgroundColor:
                              selected
                              ? '#fff'
                              : '#d9d9d9',

                          color: '#000',

                          fontWeight: 700,

                          textTransform:
                            'none',

                          '&:hover': {
                            border:
                              '2px solid #000',

                            backgroundColor:
                              '#fff',
                          },
                        }}
                      >
                        {time.label}
                      </Button>
                    );
                  }
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* FOOTER */}
        <Box
          sx={{
            borderTop: '1px solid #bbb',

            px: 4,
            py: 3,

            display: 'flex',

            justifyContent:
              'space-between',
          }}
        >
          <Button
            variant="contained"
            onClick={prevStep}
            sx={{
              backgroundColor: '#d3d3d3',
              color: '#000',

              px: 6,
              py: 1.5,

              borderRadius: 10,

              textTransform: 'none',

              fontWeight: 700,

              boxShadow: 'none',
            }}
          >
            Back
          </Button>

          <Button
            variant="contained"
            disabled={!selectedTime}
            onClick={handleNext}
            sx={{
              backgroundColor: '#f4b400',
              color: '#000',

              px: 6,
              py: 1.5,

              borderRadius: 10,

              textTransform: 'none',

              fontWeight: 'bold',

              boxShadow: 'none',

              '&.Mui-disabled': {
                backgroundColor:
                  '#d9d9d9',

                color: '#888',
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