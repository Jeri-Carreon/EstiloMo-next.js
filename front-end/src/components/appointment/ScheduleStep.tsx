'use client';

import { useMemo, useState } from 'react';

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

const availableDates = [22, 23, 24, 25, 26, 27];

const availableTimes = [
  {
    label: '10:00AM - 11:00AM',
    disabled: true,
  },

  {
    label: '11:00AM - 12:00PM',
    disabled: false,
  },

  {
    label: '12:00PM - 1:00PM',
    disabled: false,
  },

  {
    label: '1:00PM - 2:00PM',
    disabled: false,
  },

  {
    label: '2:00PM - 3:00PM',
    disabled: false,
  },

  {
    label: '3:00PM - 4:00PM',
    disabled: true,
  },

  {
    label: '4:00PM - 5:00PM',
    disabled: true,
  },

  {
    label: '5:00PM - 6:00PM',
    disabled: false,
  },

  {
    label: '6:00PM - 7:00PM',
    disabled: false,
  },

  {
    label: '7:00PM - 8:00PM',
    disabled: false,
  },
];

export default function ScheduleStep({
  appointmentData,
  setAppointmentData,
  nextStep,
  prevStep,
}: ScheduleStepProps) {
  const [selectedDate, setSelectedDate] =
    useState<number>(25);

  const [selectedTime, setSelectedTime] =
    useState<string>('7:00PM - 8:00PM');

  const days = useMemo(() => {
    const year = 2026;
    const month = 1;

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

    const cells: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }

    for (let i = 1; i <= totalDays; i++) {
      cells.push(i);
    }

    return cells;
  }, []);

  const handleNext = () => {
    setAppointmentData((prev) => ({
      ...prev,

      appointmentDate:
        '2026-02-25',

      appointmentTime:
        selectedTime,
    }));

    nextStep();
  };

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
                  February 2026
                </Typography>

                <IconButton
                  size="small"
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

                        fontSize: 12,
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
                  {days.map((day, index) => {
                    const isAvailable =
                      availableDates.includes(
                        day || 0
                      );

                    const isSelected =
                      selectedDate === day;

                    return (
                      <Box
                        key={index}
                        onClick={() => {
                          if (
                            day &&
                            isAvailable
                          ) {
                            setSelectedDate(
                              day
                            );
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
                            isAvailable
                              ? 'pointer'
                              : 'default',

                          backgroundColor:
                            isSelected
                              ? '#d9d9d9'
                              : '#efefef',

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
                  February 25, 2026
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
                {availableTimes.map(
                  (time) => {
                    const selected =
                      selectedTime ===
                      time.label;

                    return (
                      <Button
                        key={time.label}
                        disabled={
                          time.disabled
                        }
                        onClick={() =>
                          setSelectedTime(
                            time.label
                          )
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
                            time.disabled
                              ? '#e1e1e1'
                              : selected
                              ? '#fff'
                              : '#d9d9d9',

                          color:
                            time.disabled
                              ? '#9a9a9a'
                              : '#000',

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