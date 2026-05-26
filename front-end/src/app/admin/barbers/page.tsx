'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import OutlinedInput from '@mui/material/OutlinedInput';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';

import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

type Barber = {
  id: string;
  firstName: string;
  lastName: string;
  schedules: {
    id: string;
    dayOfWeek: number;
    startTime: number;
    endTime: number;
    isDayOff: boolean;
  }[];
};

type AvailabilityRow = {
  day: string;
  dayOfWeek: number;
  enabled: boolean;
  from: string;
  to: string;
};

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const TIME_OPTIONS = [
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
];

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const adjustedHour = hours % 12 || 12;

  return `${String(adjustedHour).padStart(2, '0')}:${String(mins).padStart(
    2,
    '0'
  )} ${period}`;
}

function timeToMinutes(time: string) {
  const [timePart, modifier] = time.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);

  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function getDateFromDayOfWeek(dayOfWeek: number) {
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const currentDay = today.getDay();

  const sunday = new Date(today);
  sunday.setDate(today.getDate() - currentDay);

  const target = new Date(sunday);
  target.setDate(sunday.getDate() + dayOfWeek);

  return target.toLocaleDateString('en-CA');
}

export default function BarbersPage() {
  const [openAvailability, setOpenAvailability] = useState(false);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBarberIndex, setCurrentBarberIndex] = useState(0);

  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [absentMap, setAbsentMap] = useState<Record<string, boolean>>({});

  const currentBarber = barbers[currentBarberIndex];

  useEffect(() => {
    fetchBarbers();
    fetchAbsents();
  }, []);

  async function fetchBarbers() {
    try {
      const res = await fetch('/api/admin/barbers');
      const data = await res.json();

      setBarbers(data.barbers || []);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAbsents() {
    const res = await fetch('/api/admin/barbers/absent');
    const data = await res.json();

    const map: Record<string, boolean> = {};

    data.forEach((a: any) => {
      map[`${a.barberId}-${a.date}`] = true;
    });

    setAbsentMap(map);
  }

  useEffect(() => {
    if (!currentBarber) return;

    const mapped = DAYS.map((day, index) => {
      const schedule = currentBarber.schedules.find(
        (s) => s.dayOfWeek === index
      );

      return {
        day,
        dayOfWeek: index,
        enabled: schedule ? !schedule.isDayOff : false,
        from: schedule ? minutesToTime(schedule.startTime) : '10:00 AM',
        to: schedule ? minutesToTime(schedule.endTime) : '08:00 PM',
      };
    });

    setAvailability(mapped);
  }, [currentBarber]);

  async function saveAvailability() {
    await fetch(`/api/admin/barbers/${currentBarber.id}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedules: availability.map((item) => ({
          dayOfWeek: item.dayOfWeek,
          startTime: timeToMinutes(item.from),
          endTime: timeToMinutes(item.to),
          isDayOff: !item.enabled,
        })),
      }),
    });

    setOpenAvailability(false);
    fetchBarbers();
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentBarber) {
    return <Typography>No barbers found.</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mb: 5 }}>
      <Typography variant="h3" sx={{ fontWeight: 700 }}>
        Barber&apos;s Schedule
      </Typography>

      <Typography sx={{ fontSize: '2rem', fontWeight: 700 }}>
        {currentBarber.firstName} {currentBarber.lastName}
      </Typography>

      <Button
        variant="contained"
        onClick={() => setOpenAvailability(true)}
        sx={{ width: 'fit-content', backgroundColor: '#000' }}
      >
        Edit Availability
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIosNewIcon />}
          disabled={currentBarberIndex === 0}
          onClick={() => setCurrentBarberIndex((p) => p - 1)}
        >
          Previous
        </Button>

        <Button
          variant="contained"
          endIcon={<ArrowForwardIosIcon />}
          disabled={currentBarberIndex === barbers.length - 1}
          onClick={() => setCurrentBarberIndex((p) => p + 1)}
        >
          Next
        </Button>
      </Box>

      <Dialog
        open={openAvailability}
        onClose={() => setOpenAvailability(false)}
        fullWidth
        maxWidth="md"
      >
        <Box sx={{ px: 5, py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '2rem', fontWeight: 700 }}>
              Edit Availability
            </Typography>

            <IconButton onClick={() => setOpenAvailability(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '180px 140px 1fr 1fr 120px',
              mt: 3,
              mb: 1,
              px: 1,
              fontWeight: 700,
              gap: 2,
            }}
          >
            <div>Day</div>
            <div>Date</div>
            <div>From</div>
            <div>To</div>
            <div>Absent</div>
          </Box>

          {availability.map((schedule, index) => {
            const absentDate = getDateFromDayOfWeek(schedule.dayOfWeek);
            const absentKey = `${currentBarber.id}-${absentDate}`;
            const isAbsent = !!absentMap[absentKey];

            return (
              <Box
                key={schedule.day}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '180px 140px 1fr 1fr 120px',
                  alignItems: 'center',
                  py: 1.2,
                  borderTop: '1px solid #ddd',
                  px: 1,
                  opacity: isAbsent ? 0.4 : 1,
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Checkbox
                    checked={schedule.enabled}
                    disabled={isAbsent}
                    onChange={(e) => {
                      const updated = [...availability];
                      updated[index].enabled = e.target.checked;
                      setAvailability(updated);
                    }}
                  />

                  <Typography>{schedule.day}</Typography>
                </Box>

                <Typography>{absentDate}</Typography>

                <FormControl size="small" fullWidth>
                  <Select
                    value={schedule.from}
                    disabled={!schedule.enabled || isAbsent}
                    onChange={(e) => {
                      const updated = [...availability];
                      updated[index].from = e.target.value;
                      setAvailability(updated);
                    }}
                    input={<OutlinedInput />}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <Select
                    value={schedule.to}
                    disabled={!schedule.enabled || isAbsent}
                    onChange={(e) => {
                      const updated = [...availability];
                      updated[index].to = e.target.value;
                      setAvailability(updated);
                    }}
                    input={<OutlinedInput />}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Checkbox
                    checked={isAbsent}
                    onChange={async (e) => {
                      const checked = e.target.checked;

                      if (checked) {
                        await fetch('/api/admin/barbers/absent', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            barberId: currentBarber.id,
                            date: absentDate,
                          }),
                        });
                      } else {
                        await fetch('/api/admin/barbers/absent', {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            barberId: currentBarber.id,
                            date: absentDate,
                          }),
                        });
                      }

                      setAbsentMap((prev) => ({
                        ...prev,
                        [absentKey]: checked,
                      }));
                    }}
                  />
                </Box>
              </Box>
            );
          })}

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 5 }}>
            <Button onClick={() => setOpenAvailability(false)}>Cancel</Button>

            <Button variant="contained" onClick={saveAvailability}>
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}