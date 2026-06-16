'use client';

import { useState } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// formats date in Date From: and Date To: fields
function formatDate(d: Date | null): string {
  if (!d) return '—';
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

//checks if date a and date b are the same day, month and year
function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// builds the calendar days
function buildCalDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  return [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
}

interface CalendarProps {
  monthDate: Date;
  startDate: Date | null;
  endDate: Date | null;
  onNavigate: (dir: -1 | 1) => void;
  onSelectDay: (date: Date) => void;
}

const Calendar = ({ monthDate, startDate, endDate, onNavigate, onSelectDay }: CalendarProps) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const today = new Date();
  const calDays = buildCalDays(year, month);

  const getDayState = (day: number) => {
    const dt = new Date(year, month, day);
    const isStart = sameDay(dt, startDate);
    const isEnd = sameDay(dt, endDate);
    const isToday = sameDay(dt, today);
    const isInRange = !!(startDate && endDate && dt > startDate && dt < endDate);
    return { isStart, isEnd, isToday, isInRange, dt };
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <IconButton size="small" onClick={() => onNavigate(-1)} sx={{ p: 0.5 }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15, textAlign: 'center' }}>
          {MONTHS[month]}
        </Typography>
        <IconButton size="small" onClick={() => onNavigate(1)} sx={{ p: 0.5 }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          border: '1px solid #d0d0d0',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#fff',
        }}
      >
        {/* Weekday headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {WEEKDAYS.map((d) => (
            <Box
              key={d}
              sx={{
                textAlign: 'center',
                py: 0.8,
                fontSize: 11,
                fontWeight: 600,
                color: '#666',
                borderRight: '1px solid #e0e0e0',
                borderBottom: '1px solid #d0d0d0',
                '&:last-child': { borderRight: 'none' },
              }}
            >
              {d}
            </Box>
          ))}
        </Box>

        {/* Day cells */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calDays.map((day, index) => {
            if (!day) {
              return (
                <Box
                  key={`empty-${index}`}
                  sx={{
                    minHeight: 36,
                    borderRight: '1px solid #e0e0e0',
                    borderBottom: '1px solid #e0e0e0',
                    bgcolor: '#f0f0f0',
                    '&:nth-of-type(7n)': { borderRight: 'none' },
                  }}
                />
              );
            }

            const { isStart, isEnd, isToday, isInRange, dt } = getDayState(day);

            const bgColor = isStart || isEnd
              ? '#FBBC05'
              : isInRange
              ? '#FFDF82'
              : isToday
              ? '#9c9c9c'
              : '#fafafa';

            const textColor = isStart || isEnd ? '#fff' : '#222';

            return (
              <Box
                key={index}
                onClick={() => onSelectDay(dt)}
                sx={{
                  minHeight: 36,
                  borderRight: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0',
                  p: '6px 6px 4px',
                  bgcolor: bgColor,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  '&:nth-of-type(7n)': { borderRight: 'none' },
                  '&:hover': {
                    filter: 'brightness(0.94)',
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: isStart || isEnd ? 600 : isToday ? 600 : 400,
                    color: textColor,
                    lineHeight: 1,
                  }}
                >
                  {day}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => 2020 + i);

export default function ReportsDateRangePicker() {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [leftMonth, setLeftMonth] = useState(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const [rightMonth, setRightMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [picking, setPicking] = useState<'start' | 'end'>('start');

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setLeftMonth(new Date(year, leftMonth.getMonth(), 1));
    setRightMonth(new Date(year, rightMonth.getMonth(), 1));
  };

  const handleNavigate = (side: 'left' | 'right', dir: -1 | 1) => {
    if (side === 'left') {
      setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() + dir, 1));
    } else {
      setRightMonth(new Date(rightMonth.getFullYear(), rightMonth.getMonth() + dir, 1));
    }
  };

  const handleSelectDay = (clicked: Date) => {
    if (picking === 'start' || (startDate && endDate)) {
      setStartDate(clicked);
      setEndDate(null);
      setPicking('end');
    } else {
      if (startDate && clicked < startDate) {
        setEndDate(startDate);
        setStartDate(clicked);
      } else {
        setEndDate(clicked);
      }
      setPicking('start');
    }
  };

  const handleGenerateReport = () => {
    if (!startDate || !endDate) return;
    const from = `${selectedYear}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const to = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    console.log('Generate report from', from, 'to', to);
    // TODO: call your report generation API here
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Reports
      </Typography>

      {/* Date range display */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2.5 }}>
        <Box
          sx={{
            bgcolor: '#f4f4f4',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            px: 2,
            py: 1.2,
            fontSize: 14,
            color: startDate ? '#111' : '#999',
            minHeight: 42,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Typography component="span" sx={{ fontSize: 14, color: '#666', mr: 1, fontWeight: 600 }}>
            Date From:
          </Typography>
          {formatDate(startDate)}
        </Box>

        <Box
          sx={{
            bgcolor: '#f4f4f4',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            px: 2,
            py: 1.2,
            fontSize: 14,
            color: endDate ? '#111' : '#999',
            minHeight: 42,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Typography component="span" sx={{ fontSize: 14, color: '#666', mr: 1, fontWeight: 600 }}>
            Date To:
          </Typography>
          {formatDate(endDate)}
        </Box>
      </Box>

      {/* Year selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <Typography sx={{ fontSize: 14, color: '#555' }}>Year:</Typography>
        <Select
          value={selectedYear}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          size="small"
          sx={{ fontSize: 14, minWidth: 100 }}
        >
          {YEAR_OPTIONS.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Calendars */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <Calendar
          monthDate={leftMonth}
          startDate={startDate}
          endDate={endDate}
          onNavigate={(dir) => handleNavigate('left', dir)}
          onSelectDay={handleSelectDay}
        />
        <Calendar
          monthDate={rightMonth}
          startDate={startDate}
          endDate={endDate}
          onNavigate={(dir) => handleNavigate('right', dir)}
          onSelectDay={handleSelectDay}
        />
      </Box>

      {/* Generate button */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          onClick={handleGenerateReport}
          disabled={!startDate || !endDate}
          sx={{
            bgcolor: '#111',
            color: '#FBBC05',
            px: 5,
            py: 1.4,
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 2,
            textTransform: 'none',
            '&:hover': { bgcolor: '#333' },
            '&:disabled': { bgcolor: '#ccc', color: '#fff' },
          }}
        >
          Generate Report
        </Button>
      </Box>
    </Box>
  );
}