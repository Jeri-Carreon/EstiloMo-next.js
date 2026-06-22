'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";

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

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import InfoIcon from '@mui/icons-material/Info';
import Pagination from '@mui/material/Pagination';

import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';

import TextField from '@mui/material/TextField';

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

interface Appointment {
  id: string;
  appointmentCode: string;
  customerCode: string;
  customerName: string;
  schedule: string;
  appointmentDate?: string;
  startMinutes?: number;
  endMinutes?: number;
  serviceName: string;
  serviceId?: string;       
  barberId?: string;
  barberName: string;
  totalAmount: number | string | null;
  status: string;
  paymentScreenshotUrl?: string | null;
  afterServicePhotoUrl?: string | null;
  afterServicePhotos?: {
    id: string;
    imageUrl: string;
    createdAt?: string;
  }[];
}

interface ServiceOption {
  id: string;
  name: string;
  price?: number;
}

interface AvailableTime {
  startMinutes: number;
  endMinutes: number;
  label: string;
}

interface BarberOption {
  id: string;
  name: string;
}

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

function formatDateInput(date: Date) {
  return date.toLocaleDateString('en-CA');
}

export default function BarbersPage() {
  const [openAvailability, setOpenAvailability] = useState(false);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberLoading, setBarberLoading] = useState(true);
  const [currentBarberIndex, setCurrentBarberIndex] = useState(0);

  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [absentMap, setAbsentMap] = useState<Record<string, boolean>>({});

  // Session
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<string>('');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [error, setError] = useState("");

  const [scheduledPage, setScheduledPage] = useState(1);
  const [processedPage, setProcessedPage] = useState(1);

  // Search & Filter
  const [processedSearch, setProcessedSearch] = useState('');
  const [processedStatusFilter, setProcessedStatusFilter] = useState('ALL');
  const itemsPerPage = 4;

  const currentBarber = barbers[currentBarberIndex];

  const [openEditModal, setOpenEditModal] = useState(false);
  const [openEditDayModal, setOpenEditDayModal] = useState(false);

  // Calendar View
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [openCalendarModal, setOpenCalendarModal] = useState(false);
  

  // Day View
    const [dayViewDate, setDayViewDate] = useState(new Date());
    const [openDayViewModal, setOpenDayViewModal] = useState(false);

  // Edit Appointment
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState('');
  const [imageViewerTitle, setImageViewerTitle] = useState('');
  const [imageViewerPhotos, setImageViewerPhotos] = useState<
    { id: string; imageUrl: string; createdAt?: string }[]
  >([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const [photoSuccessOpen, setPhotoSuccessOpen] = useState(false);
  const [photoSuccessMessage, setPhotoSuccessMessage] = useState('');
  const [pendingAfterServicePhotoUrls, setPendingAfterServicePhotoUrls] = useState<string[]>([]);

  // For edit schedule modal
  const [openEditScheduleModal, setOpenEditScheduleModal] = useState(false);
  const [selectedAddDate, setSelectedAddDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<AvailableTime | null>(null);
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [addCurrentMonth, setAddCurrentMonth] = useState(new Date());

  const barberOption = barbers.map((b) => ({
  id: b.id,
  name: `${b.firstName} ${b.lastName}`,
}));

  useEffect(() => {
    fetchBarbers();
    fetchAbsents();
  }, []);

  const canUploadAfterServicePhoto =
  selectedAppointment?.status?.toUpperCase() === 'COMPLETED';

  const openImageViewer = (
    title: string,
    photos: { id: string; imageUrl: string; createdAt?: string }[],
    index = 0
  ) => {
    const validPhotos = photos.filter((photo) => !!photo.imageUrl);

    setImageViewerTitle(title);
    setImageViewerPhotos(validPhotos);
    setImageViewerIndex(index);

    const selectedPhoto = validPhotos[index] || validPhotos[0];

    setImageViewerUrl(selectedPhoto?.imageUrl || '');
    setImageViewerOpen(true);
  };

  const getAfterServicePhotos = (appointment: Appointment | null) => {
    if (!appointment) return [];

    const photos = appointment.afterServicePhotos || [];

    if (photos.length > 0) {
      return photos.filter((photo) => !!photo.imageUrl);
    }

    return appointment.afterServicePhotoUrl
      ? [
          {
            id: 'legacy-after-service-photo',
            imageUrl: appointment.afterServicePhotoUrl,
          },
        ]
      : [];
  };

  const loadServicesByBarber = async (barberId: string) => {
    try {
      const res = await fetch(`/api/appointment/services?barberId=${barberId}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      setServices(
        (data.services || data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          price: Number(s.price || 0),
        }))
      );
    } catch (error) {
      console.error('LOAD SERVICES ERROR:', error);
      setServices([]);
    }
  };

  const handleUpdateAppointment = async () => {
    console.log('SAVE CLICKED');
    console.log('SELECTED APPOINTMENT:', selectedAppointment);
    console.log('CAN UPLOAD:', canUploadAfterServicePhoto);
    console.log('PENDING PHOTO URLS TO SAVE:', pendingAfterServicePhotoUrls);

    if (!selectedAppointment || !canUploadAfterServicePhoto) {
      alert('This appointment is not allowed to upload after-service photos.');
      return;
    }

    if (pendingAfterServicePhotoUrls.length === 0) {
      alert('Please upload an after-service photo first.');
      return;
    }

    try {
      setSaving(true);

      const uniquePhotoUrls = Array.from(new Set(pendingAfterServicePhotoUrls));

      for (const photoUrl of uniquePhotoUrls) {
        const payload = {
          afterServicePhotoUrl: photoUrl,
        };

        console.log('PUT URL:', `/api/admin/appointments/${selectedAppointment.id}`);
        console.log('PUT PAYLOAD:', payload);

        const res = await fetch(`/api/admin/appointments/${selectedAppointment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        console.log('PUT STATUS:', res.status);
        console.log('PUT RAW RESPONSE:', text);

        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error('PUT JSON PARSE ERROR:', parseError);
        }

        console.log('PUT PARSED RESPONSE:', data);

        if (!res.ok) {
          alert(data.error || data.details || 'Failed to save after-service photo.');
          return;
        }
      }

      setPendingAfterServicePhotoUrls([]);
      setPhotoSuccessMessage(
        uniquePhotoUrls.length > 1
          ? 'After-service photos uploaded successfully!'
          : 'After-service photo uploaded successfully!'
      );
      setPhotoSuccessOpen(true);

      setOpenEditModal(false);
      setOpenEditDayModal(false);
      setSelectedAppointment(null);

      if (currentBarber?.id) {
        await loadAppointments(currentBarber.id);
      }
    } catch (error) {
      console.error('SAVE AFTER SERVICE PHOTO ERROR:', error);
      alert('Failed to save after-service photo.');
    } finally {
      setSaving(false);
    }
  };

  async function fetchBarbers() {
    try {
      const res = await fetch('/api/admin/barbers');
      const data = await res.json();

      setBarbers(data.barbers || []);
    } finally {
      setBarberLoading(false);
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

  const loadAppointments = async (barberId: string) => {
    try {
      setError("");
      setAppointments([]);
      setAppointmentLoading(true);

      const res = await fetch(`/api/admin/barbers/${barberId}`, { cache: "no-store" });

      if (res.status === 403) {
        router.push("/unauthorized");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to load appointments.");
        setAppointments([]);
      } else {
        setAppointments(
          (data || []).map((appointment: any) => ({
            id: appointment.id,
            appointmentCode: appointment.appointmentCode,
            customerCode: appointment.customer?.customerCode || "",
            customerName: appointment.customer?.name || "",
            appointmentDate: appointment.appointmentDate || "",
            startMinutes: appointment.schedule?.startTime ? timeToMinutes(appointment.schedule.startTime) : null,
            endMinutes: appointment.schedule?.endTime ? timeToMinutes(appointment.schedule.endTime) : null,
            schedule: appointment.schedule?.formatted || "",
            barberId: appointment.barberId,
            barberName:
            appointment.barber?.name ||
            [appointment.barber?.firstName, appointment.barber?.lastName]
              .filter(Boolean)
              .join(' ') ||
            '',
            serviceId: appointment.serviceId,
            serviceName: appointment.service?.name || "",
            totalAmount:
              appointment.payment?.amount !== undefined &&
              appointment.payment?.amount !== null
                ? appointment.payment.amount
                : null,
            status: appointment.status || "",
            paymentScreenshotUrl: appointment.payment?.screenshotUrl || null,
            afterServicePhotoUrl: appointment.afterServicePhotoUrl || null,
            afterServicePhotos: appointment.afterServicePhotos || [],
          }))
        );
        setError("");
      }
    } catch (error) {
      console.error('LOAD APPOINTMENTS ERROR:', error);
      setError("Unable to load appointments.");
      setAppointments([]);
    }

    setAppointmentLoading(false);
  };

  useEffect(() => {
  const init = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/user/role')
      const data = await res.json()
      setRole(data.role)

      if (!['OWNER', 'RECEPTIONIST'].includes(data.role)) {
        router.push('/unauthorized')
        return
      }
    } catch (error) {
      console.error(error)
    }
  }

  init()
}, [router])

  useEffect(() => {
    if (currentBarber?.id) {
      loadAppointments(currentBarber.id)
    }
}, [currentBarber])

  const formatAmount = (amount: number | string | null) => {
    if (amount === null || amount === undefined) {
      return "-";
    }

    const parsed = typeof amount === "string" ? parseFloat(amount) : amount;
    if (parsed === null || parsed === undefined || Number.isNaN(parsed)) {
      return "-";
    }

    return `₱ ${parsed.toFixed(2)}`;
  };

  {/* Scheduled Appointments */}
  const filteredScheduledAppointments = appointments.filter((appointment) => {
    return appointment.status === "SCHEDULED";
  });

  const paginatedScheduledAppointments = filteredScheduledAppointments.slice(
    (scheduledPage - 1) * itemsPerPage,
    scheduledPage * itemsPerPage
  );

  const totalPagesScheduled = Math.ceil(
    filteredScheduledAppointments.length / itemsPerPage
  );

  {/* Processed Appointments */}
  const processedBaseAppointments = appointments.filter(
  (appointment) => appointment.status.toUpperCase() !== 'SCHEDULED' && appointment.status.toUpperCase() !== 'PENDING' && appointment.status.toUpperCase() !== 'REJECTED'
  );

  const filteredProcessedAppointments = processedBaseAppointments.filter(
    (appointment) => {
      const searchValue = processedSearch.toLowerCase();

      const matchesSearch =
        appointment.appointmentCode.toLowerCase().includes(searchValue) ||
        appointment.customerCode.toLowerCase().includes(searchValue) ||
        appointment.customerName.toLowerCase().includes(searchValue) ||
        appointment.schedule.toLowerCase().includes(searchValue) ||
        appointment.serviceName.toLowerCase().includes(searchValue) ||
        appointment.barberName.toLowerCase().includes(searchValue) ||
        appointment.status.toLowerCase().includes(searchValue);

      const matchesStatus =
        processedStatusFilter === 'ALL' ||
        appointment.status.toUpperCase() === processedStatusFilter;

      const isProcessed =
        appointment.status !== "SCHEDULED" && 
        appointment.status !== "PENDING" &&
        appointment.status !== "REJECTED";
      return matchesSearch && matchesStatus && isProcessed;
    }
  );

  const paginatedProcessedAppointments = filteredProcessedAppointments.slice(
    (processedPage - 1) * itemsPerPage,
    processedPage * itemsPerPage
  );

  const totalPagesProcessed = Math.ceil(
    filteredProcessedAppointments.length / itemsPerPage
  );

  if (barberLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  // CALENDAR VIEW
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatMinutes(minutes: number) {
  if (minutes === undefined || minutes === null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

const AppointmentCalendar = ({ appointments }: { appointments: Appointment[] }) => {
  const currentMonth = calendarMonth;
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const calDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const getAppointmentsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter((a) => a.appointmentDate?.startsWith(dateStr) && a.status !== "PENDING" && a.status !== "REJECTED");
  };

  const statusColor: Record<string, { bg: string; color: string }> = {
    SCHEDULED: { bg: '#DBEAFE', color: '#1E40AF' },
    COMPLETED: { bg: '#D1FAE5', color: '#065f46' },
    CANCELLED: { bg: '#d81d1d', color: '#2b1515' },
    NOSHOW: { bg: '#E5E7EB', color: '#1F2937' },
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
          mb: 2,
        }}
      >
        <IconButton
          size="small"
          onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
          sx={{ border: '1px solid #d0d0d0', bgcolor: '#fff' }}
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>

        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '1.1rem',
            minWidth: 160,
            textAlign: 'center',
          }}
        >
          {currentMonth.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          })}
        </Typography>

        <IconButton
          size="small"
          onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
          sx={{ border: '1px solid #d0d0d0', bgcolor: '#fff' }}
        >
          <ArrowForwardIosIcon fontSize="small" />
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
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {weekdays.map((day) => (
            <Box
              key={day}
              sx={{
                textAlign: 'center',
                py: 1.2,
                fontSize: 12,
                fontWeight: 700,
                borderRight: '1px solid #e0e0e0',
                borderBottom: '1px solid #d0d0d0',
                '&:last-child': { borderRight: 'none' },
              }}
            >
              {day}
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calDays.map((day, index) => {
            const dayAppointments = day ? getAppointmentsForDay(day) : [];

            const isToday =
                day !== null &&
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();

            return (
              <Box
                key={index}
                sx={{
                  minHeight: 90,
                  borderRight: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0',
                  p: 0.5,
                  bgcolor: isToday ? '#8d8d8d' : day ? '#fafafa' : '#f0f0f0',
                  '&:nth-of-type(7n)': { borderRight: 'none' },
                }}
              >
                {day && (
                  <>
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: '#999',
                        textAlign: 'right',
                        pr: 0.5,
                      }}
                    >
                      {day}
                    </Typography>

                    {dayAppointments.map((appointment) => {
                      const colors =
                        statusColor[appointment.status.toUpperCase()] ||
                        statusColor.NOSHOW;

                      return (
                        <Box
                          key={appointment.id}
                          title={`${appointment.customerName} - ${appointment.serviceName} (${appointment.barberName})`}
                          onClick={async () => {
                            setServices([]);

                            if (appointment.barberId) {
                              await loadServicesByBarber(appointment.barberId);
                            }

                            setPendingAfterServicePhotoUrls([]);
                            setSelectedAppointment(appointment);
                            setOpenEditModal(true);
                          }}
                          sx={{
                            fontSize: 10,
                            fontWeight: 600,
                            px: 0.8,
                            py: 0.3,
                            mb: 0.3,
                            borderRadius: 1,
                            bgcolor: colors.bg,
                            color: colors.color,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            '&:hover': { filter: 'brightness(0.92)' },
                          }}
                        >
                          {appointment.startMinutes != null && appointment.endMinutes != null && (
                            <> {formatMinutes(appointment.startMinutes)} - {formatMinutes(appointment.endMinutes)} </>
                          )}
                        </Box>
                      );
                    })}
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
        {Object.entries(statusColor).map(([label, colors]) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '2px',
                bgcolor: colors.bg,
                border: `1px solid ${colors.color}`,
              }}
            />
            <Typography sx={{ fontSize: 11, color: '#777' }}>{label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
  
  if (!currentBarber) {
    return <Typography>No barbers found.</Typography>;
  }

  
  return (
    <Box sx={{ flex: 1, p: 4, backgroundColor: "#fff" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 4,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          Barber's Management
        </Typography>
      </Box>
      
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {currentBarber.firstName} {currentBarber.lastName}
        </Typography>
      </Box>

        {["OWNER", "RECEPTIONIST"].includes(role) && (
          <Button
            variant="contained"
            onClick={() => setOpenAvailability(true)}
            sx={{ width: 'fit-content', backgroundColor: '#000', mb: 2 }}
          >
            Edit Availability
          </Button>
        )}
      

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Scheduled appointments
        </Typography>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {appointmentLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : appointments.length === 0 ? (
        <Typography sx={{ textAlign: "center", color: "text.secondary" }}>
          No appointments found.
        </Typography>
      ) : (
        <>
          <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Appointment#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Schedule</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Barber Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedScheduledAppointments.map((appointment) => (
                <TableRow
                  key={appointment.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#fafafa',
                    },
                  }}
                >
                  <TableCell>{appointment.appointmentCode}</TableCell>
                  <TableCell>{appointment.customerCode}</TableCell>
                  <TableCell>{appointment.customerName}</TableCell>
                  <TableCell>{appointment.schedule}</TableCell>
                  <TableCell>{appointment.serviceName}</TableCell>
                  <TableCell>{appointment.barberName}</TableCell>
                  <TableCell>{formatAmount(appointment.totalAmount)}</TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color:
                        appointment.status === 'COMPLETED'
                          ? 'green'
                          : appointment.status === 'CANCELLED'
                          ? 'red'
                          : '#333',
                    }}
                  >
                    {appointment.status}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      aria-label="view appointment"
                      onClick={async () => {
                        setServices([]);
                        if (appointment.barberId) {
                          await loadServicesByBarber(appointment.barberId);
                        }
                        setPendingAfterServicePhotoUrls([]);
                        setSelectedAppointment(appointment);
                        setOpenEditModal(true);
                      }}
                    >
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PAGINATION CONTROLS * */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 4,
            }}
          >
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: 14,
              }}
            >
              Showing 1 to {paginatedScheduledAppointments.length} of{' '}
              {filteredScheduledAppointments.length} Entries
            </Typography>
  
            <Pagination
              count={totalPagesScheduled}
              page={scheduledPage}
              onChange={(_, value) => setScheduledPage(value)}
              size="small"
            />
          </Box>
        </>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Processed appointments
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search processed appointments..."
          value={processedSearch}
          onChange={(e) => {
            setProcessedSearch(e.target.value);
            setProcessedPage(1);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#999' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            flex: 1,
            maxWidth: 300,
          }}
        />

        <TextField
          select
          size="small"
          value={processedStatusFilter}
          onChange={(e) => {
            setProcessedStatusFilter(e.target.value);
            setProcessedPage(1);
          }}
          sx={{
            width: 170,
            bgcolor: '#fff',
          }}
        >
          <MenuItem value="ALL">All Status</MenuItem>
          <MenuItem value="COMPLETED">Completed</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
          <MenuItem value="NOSHOW">No-show</MenuItem>
        </TextField>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {appointmentLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : appointments.length === 0 ? (
        <Typography sx={{ textAlign: "center", color: "text.secondary" }}>
          No appointments found.
        </Typography>
      ) : (
        <>
          <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Appointment#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Schedule</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Barber Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedProcessedAppointments.map((appointment) => (
                <TableRow
                  key={appointment.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#fafafa',
                    },
                  }}
                >
                  <TableCell>{appointment.appointmentCode}</TableCell>
                  <TableCell>{appointment.customerCode}</TableCell>
                  <TableCell>{appointment.customerName}</TableCell>
                  <TableCell>{appointment.schedule}</TableCell>
                  <TableCell>{appointment.serviceName}</TableCell>
                  <TableCell>{appointment.barberName}</TableCell>
                  <TableCell>{formatAmount(appointment.totalAmount)}</TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color:
                        appointment.status === 'COMPLETED'
                          ? 'green'
                          : appointment.status === 'CANCELLED'
                          ? 'red'
                          : '#333',
                    }}
                  >
                    {appointment.status}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      aria-label="view appointment"
                      onClick={async () => {
                        setServices([]);
                        if (appointment.barberId) {
                          await loadServicesByBarber(appointment.barberId);
                        }
                        setPendingAfterServicePhotoUrls([]);
                        setSelectedAppointment(appointment);
                        setOpenEditModal(true);
                      }}
                    >
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PAGINATION CONTROLS * */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 4,
            }}
          >
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: 14,
              }}
            >
              Showing 1 to {paginatedProcessedAppointments.length} of{' '}
              {filteredProcessedAppointments.length} Entries
            </Typography>
  
            <Pagination
              count={totalPagesProcessed}
              page={processedPage}
              onChange={(_, value) => setProcessedPage(value)}
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 2 }}>
              <Button
                startIcon={<CalendarMonthIcon />}
                onClick={() => setOpenCalendarModal(true)}
                sx={{
                  border: '1px solid #ccc',
                  color: '#555',
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2,
                  mr: 2,
                }}
              >
                Calendar View
              </Button>
              <Button
                startIcon={<CalendarMonthIcon />}
                onClick={() => {
                  setDayViewDate(new Date());
                  setOpenDayViewModal(true);
                }}
                sx={{
                  border: '1px solid #ccc',
                  color: '#555',
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2,
                }}
              >
                Day View
              </Button>
            </Box>
        </>

        
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2}}>
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

        {/* Schedule Dialog Box */}
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

      {/* CALENDAR VIEW MODAL */}
        <Dialog
          open={openCalendarModal}
          onClose={() => setOpenCalendarModal(false)}
          fullWidth
          maxWidth={false}
          slotProps={{
            paper: {
              sx: {
                width: '1100px',
                maxWidth: '95vw',
              },
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            Calendar View
            <IconButton
              onClick={() => setOpenCalendarModal(false)}
              sx={{ position: 'absolute', right: 12, top: 10 }}
            >
              <CloseIcon />
            </IconButton>
  
          </DialogTitle>
  
          <DialogContent sx={{ bgcolor: '#f5f5f5', pt: 2 }}>
            <AppointmentCalendar appointments={appointments} />
          </DialogContent>
        </Dialog>
      
      {/* EDIT MODAL (DAY) */}
      <Dialog
        open={openEditDayModal}
        onClose={() => setOpenEditDayModal(false)}
        fullWidth
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: '650px',
              maxWidth: '95vw',
              bgcolor: '#f2f2f2',
              borderRadius: 0,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: 24, pb: 1 }}>
          Edit Appointment Details

          <IconButton
            onClick={() => {
              setOpenEditDayModal(false)
              setOpenDayViewModal(true);
            }}
            sx={{ position: 'absolute', right: 12, top: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {selectedAppointment && (
          <>
            <DialogContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                pt: 1,
              }}
            >
              <Typography sx={{ fontSize: 12, color: '#555' }}>
                Customer ID: {selectedAppointment.customerCode}
              </Typography>

              <TextField
                label="Name *"
                value={selectedAppointment.customerName}
                disabled
                size="small"
                sx={{ bgcolor: '#fff' }}
              />

              <TextField
                select
                label="Barber *"
                value={selectedAppointment.barberId || ''}
                disabled
                size="small"
                sx={{ bgcolor: '#fff' }}
                onChange={(e) => {
                  const barberId = e.target.value;

                  setSelectedAppointment((prev) =>
                    prev
                      ? {
                          ...prev,
                          barberId,
                          serviceId: '',
                          appointmentDate: '',
                          startMinutes: undefined,
                          endMinutes: undefined,
                          schedule: '',
                        }
                      : prev
                  );

                  setServices([]);
                  loadServicesByBarber(barberId);
                }}
              >
                {barberOption.map((barber) => (
                  <MenuItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Service *"
                value={
                  services.some(
                    (service) => service.id === selectedAppointment.serviceId
                  )
                    ? selectedAppointment.serviceId
                    : ''
                }
                disabled
                size="small"
                sx={{ bgcolor: '#fff' }}
                onChange={(e) =>
                  setSelectedAppointment((prev) =>
                    prev
                      ? {
                          ...prev,
                          serviceId: e.target.value,
                          appointmentDate: '',
                          startMinutes: undefined,
                          endMinutes: undefined,
                          schedule: '',
                        }
                      : prev
                  )
                }
              >
                {services.map((service) => (
                  <MenuItem key={service.id} value={service.id}>
                    {service.name}
                  </MenuItem>
                ))}
              </TextField>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Schedule *"
                  value={selectedAppointment.schedule || 'Select schedule'}
                  disabled
                  fullWidth
                  size="small"
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: '#111',
                    },
                  }}
                />

                <IconButton
                  disabled
                  onClick={() => {
                    setOpenEditDayModal(true);
                    setSelectedAddDate(null);
                    setSelectedTime(null);
                    setAvailableTimes([]);
                  }}
                  sx={{
                    bgcolor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: 1,
                    width: 42,
                    height: 40,
                    '&:hover': {
                      bgcolor: '#eee',
                    },
                  }}
                >
                  <CalendarMonthIcon />
                </IconButton>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 13, color: '#555', mb: 0.5 }}>
                  Proof of Downpayment <span style={{ color: 'red' }}>*</span>
                </Typography>

                <Box
                  sx={{
                    bgcolor: '#fff',
                    minHeight: 38,
                    display: 'flex',
                    alignItems: 'center',
                    px: 1.5,
                  }}
                >
                  {selectedAppointment.paymentScreenshotUrl ? (
                    <Button
                      onClick={() => {
                        openImageViewer('Proof of Downpayment', [
                          {
                            id: 'proof-of-downpayment',
                            imageUrl: selectedAppointment.paymentScreenshotUrl || '',
                          },
                        ]);
                      }}
                      sx={{
                        p: 0,
                        color: '#3b82f6',
                        textTransform: 'none',
                        fontSize: 13,
                      }}
                    >
                      View Image
                    </Button>
                  ) : (
                    <Typography sx={{ color: '#999', fontSize: 13 }}>
                      No proof uploaded
                    </Typography>
                  )}
                </Box>
              </Box>

              <TextField
                select
                label="Status *"
                value={selectedAppointment.status}
                disabled
                size="small"
                sx={{ bgcolor: '#fff' }}
                onChange={(e) =>
                  setSelectedAppointment((prev) =>
                    prev ? { ...prev, status: e.target.value } : prev
                  )
                }
              >
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="NOSHOW">No-show</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </TextField>

              <Box>
                <Typography sx={{ fontSize: 13, color: '#555', mb: 0.5 }}>
                  After Service Photos
                </Typography>

                <Box
                  sx={{
                    bgcolor: '#fff',
                    minHeight: 38,
                    display: 'flex',
                    alignItems: 'center',
                    px: 1.5,
                    gap: 1,
                  }}
                >
                  {getAfterServicePhotos(selectedAppointment).length > 0 ? (
                    getAfterServicePhotos(selectedAppointment).map((photo, index) => (
                      <Button
                        key={photo.id || photo.imageUrl}
                        onClick={() => {
                          openImageViewer(
                            'After Service Photos',
                            getAfterServicePhotos(selectedAppointment),
                            index
                          );
                        }}
                        sx={{
                          p: 0,
                          color: '#3b82f6',
                          textTransform: 'none',
                          fontSize: 13,
                        }}
                      >
                        View Image {index + 1}
                      </Button>
                    ))
                  ) : (
                    <Typography sx={{ color: '#999', fontSize: 13 }}>
                      No after service photos
                    </Typography>
                  )}
                </Box>
              </Box>
            </DialogContent>

            <DialogActions
              sx={{
                px: 3,
                pb: 3,
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <Button
                onClick={() => {
                  setOpenEditDayModal(false);
                  setOpenDayViewModal(true);
                }}
                sx={{
                  backgroundColor: '#777',
                  color: '#f4b400',
                  width: 180,
                  minHeight: 44,
                  py: 1,
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': {
                    backgroundColor: '#666',
                  },
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={handleUpdateAppointment}
                disabled={!canUploadAfterServicePhoto || pendingAfterServicePhotoUrls.length === 0 || saving}
                sx={{
                  backgroundColor: '#000',
                  color: '#f4b400',
                  width: 180,
                  minHeight: 44,
                  py: 1,
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  '&:hover': {
                    backgroundColor: '#111',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: '#ccc',
                    color: '#777',
                  },
                }}
              >
                {saving ? 'Saving...' : pendingAfterServicePhotoUrls.length > 1 ? 'Save Photos' : 'Save Photo'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DAY VIEW MODAL */}
      <Dialog
        open={openDayViewModal}
        onClose={() => setOpenDayViewModal(false)}
        fullWidth
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: '520px',
              maxWidth: '95vw',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {dayViewDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          <Box sx={{ display: 'flex', gap: 0.5, position: 'absolute', right: 48, top: 14 }}>
            <IconButton
              size="small"
              onClick={() =>
                setDayViewDate((prev) => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() - 1);
                  return d;
                })
              }
              sx={{ border: '1px solid #d0d0d0', bgcolor: '#fff' }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() =>
                setDayViewDate((prev) => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() + 1);
                  return d;
                })
              }
              sx={{ border: '1px solid #d0d0d0', bgcolor: '#fff' }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
          <IconButton
            onClick={() => setOpenDayViewModal(false)}
            sx={{ position: 'absolute', right: 12, top: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, bgcolor: '#f2f2f2' }}>
          {(() => {
            const dateStr = formatDateInput(dayViewDate);
            const dayAppointments = appointments.filter((a) =>
              a.appointmentDate?.startsWith(dateStr) && a.status !== 'PENDING' && a.status !== 'REJECTED'
            );

            const hours = Array.from({ length: 11 }, (_, i) => i + 10);

            const statusColorMap: Record<string, { bg: string; color: string }> = {
              SCHEDULED: { bg: '#DBEAFE', color: '#1E40AF' },
              COMPLETED: { bg: '#D1FAE5', color: '#065f46' },
              CANCELLED: { bg: '#d81d1d', color: '#2b1515' },
              NOSHOW: { bg: '#E5E7EB', color: '#1F2937' },
            };

            return (
              <>
                <Box sx={{ position: 'relative' }}>
                  {hours.map((hour) => {
                    const label =
                      hour === 12
                        ? '12 PM'
                        : hour < 12
                        ? `${hour} AM`
                        : `${hour - 12} PM`;

                    const apptInSlot = dayAppointments.filter((a) => {
                      const start = a.startMinutes ?? 0;
                      return start >= hour * 60 && start < (hour + 1) * 60;
                    });

                    return (
                      <Box
                        key={hour}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '64px 1fr',
                          borderBottom: '1px solid #d5d5d5',
                        }}
                      >
                        <Box
                          sx={{
                            borderRight: '1px solid #d5d5d5',
                            py: 1.5,
                            px: 1,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#555',
                            bgcolor: '#fff',
                            minHeight: 56,
                            display: 'flex',
                            alignItems: 'flex-start',
                            pt: 1.5,
                          }}
                        >
                          {label}
                        </Box>

                        <Box sx={{ minHeight: 56, position: 'relative', p: 0.5 }}>
                          {apptInSlot.map((appt) => {
                            const colors =
                              statusColorMap[appt.status.toUpperCase()] ||
                              statusColorMap.NOSHOW;

                            return (
                              <Box
                                key={appt.id}
                                onClick={() => {
                                  setPendingAfterServicePhotoUrls([]);
                                  setSelectedAppointment(appt);
                                  setOpenEditDayModal(true);
                                }}
                                sx={{
                                  bgcolor: colors.bg,
                                  color: colors.color,
                                  border: `1px solid ${colors.color}`,
                                  borderRadius: 1,
                                  px: 1.5,
                                  py: 1,
                                  mb: 0.5,
                                  cursor: 'pointer',
                                  '&:hover': { filter: 'brightness(0.92)' },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 0.3,
                                  }}
                                >
                                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: colors.color }}>
                                    {formatMinutes(appt.startMinutes ?? 0)} - {formatMinutes(appt.endMinutes ?? 0)}
                                  </Typography>
                                  <Typography sx={{ fontSize: 12, color: colors.color, opacity: 0.8 }}>
                                    {appt.barberName}
                                  </Typography>
                                </Box>
                                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                  <Box component="li" sx={{ fontSize: 11, color: colors.color }}>
                                    {appt.serviceName}
                                  </Box>
                                </Box>
                              </Box>
                            );
                          })}

                          {/* Ghost appointments that started before this hour but span into it */}
                          {dayAppointments
                            .filter((a) => {
                              const start = a.startMinutes ?? 0;
                              const end = a.endMinutes ?? 0;
                              return start < hour * 60 && end > hour * 60;
                            })
                            .map((appt) => {
                              const colors =
                                statusColorMap[appt.status.toUpperCase()] ||
                                statusColorMap.NOSHOW;

                              return (
                                <Box
                                  key={`ghost-${appt.id}-${hour}`}
                                  sx={{
                                    bgcolor: colors.bg,
                                    color: colors.color,
                                    border: `1px solid ${colors.color}`,
                                    opacity: 0.9,
                                    borderRadius: 1,
                                    px: 1.5,
                                    py: 0.5,
                                    mb: 0.5,
                                    cursor: 'default',
                                    fontSize: 11,
                                    '&:hover': { opacity: 0.8 },
                                  }}
                                >
                                  {formatMinutes(appt.startMinutes ?? 0)} -{' '}
                                  {formatMinutes(appt.endMinutes ?? 0)}{' '}
                                  {appt.serviceName}, {appt.barberName}
                                </Box>
                              );
                            })}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', p: 2, bgcolor: '#f2f2f2' }}>
                  {Object.entries(statusColorMap).map(([label, colors]) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '2px',
                          bgcolor: colors.bg,
                          border: `1px solid ${colors.color}`,
                        }}
                      />
                      <Typography sx={{ fontSize: 11, color: '#777' }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
        
        {/* EDIT MODAL (TABLE & CALENDAR) */}
          <Dialog
            open={openEditModal}
            onClose={() => setOpenEditModal(false)}
            fullWidth
            maxWidth={false}
            slotProps={{
              paper: {
                sx: {
                  width: '650px',
                  maxWidth: '95vw',
                  bgcolor: '#f2f2f2',
                  borderRadius: 0,
                },
              },
            }}
          >
            <DialogTitle sx={{ fontWeight: 900, fontSize: 24, pb: 1 }}>
              Edit Appointment Details
    
              <IconButton
                onClick={() => setOpenEditModal(false)}
                sx={{ position: 'absolute', right: 12, top: 10 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
    
            {selectedAppointment && (
              <>
                <DialogContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    pt: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 12, color: '#555' }}>
                    Customer ID: {selectedAppointment.customerCode}
                  </Typography>
    
                  <TextField
                    label="Name *"
                    value={selectedAppointment.customerName}
                    disabled
                    size="small"
                    sx={{ bgcolor: '#fff' }}
                  />
    
                  <TextField
                    select
                    label="Barber *"
                    value={selectedAppointment.barberId || ''}
                    disabled
                    size="small"
                    sx={{ bgcolor: '#fff' }}
                    onChange={(e) => {
                      const barberId = e.target.value;
    
                      setSelectedAppointment((prev) =>
                        prev
                          ? {
                              ...prev,
                              barberId,
                              serviceId: '',
                              appointmentDate: '',
                              startMinutes: undefined,
                              endMinutes: undefined,
                              schedule: '',
                            }
                          : prev
                      );
    
                      setServices([]);
                      loadServicesByBarber(barberId);
                    }}
                  >
                    {barberOption.map((barber) => (
                      <MenuItem key={barber.id} value={barber.id}>
                        {barber.name}
                      </MenuItem>
                    ))}
                  </TextField>
    
                  <TextField
                    select
                    label="Service *"
                    value={
                      services.some(
                        (service) => service.id === selectedAppointment.serviceId
                      )
                        ? selectedAppointment.serviceId
                        : ''
                    }
                    disabled
                    size="small"
                    sx={{ bgcolor: '#fff' }}
                    onChange={(e) =>
                      setSelectedAppointment((prev) =>
                        prev
                          ? {
                              ...prev,
                              serviceId: e.target.value,
                              appointmentDate: '',
                              startMinutes: undefined,
                              endMinutes: undefined,
                              schedule: '',
                            }
                          : prev
                      )
                    }
                  >
                    {services.map((service) => (
                      <MenuItem key={service.id} value={service.id}>
                        {service.name}
                      </MenuItem>
                    ))}
                  </TextField>
    
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      label="Schedule *"
                      value={selectedAppointment.schedule || 'Select schedule'}
                      disabled
                      fullWidth
                      size="small"
                      sx={{
                        bgcolor: '#fff',
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#111',
                        },
                      }}
                    />
    
                    <IconButton
                      disabled
                      onClick={() => {
                        setOpenEditScheduleModal(true);
                        setSelectedAddDate(null);
                        setSelectedTime(null);
                        setAvailableTimes([]);
                      }}
                      sx={{
                        bgcolor: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        width: 42,
                        height: 40,
                        '&:hover': {
                          bgcolor: '#eee',
                        },
                      }}
                    >
                      <CalendarMonthIcon />
                    </IconButton>
                  </Box>
    
                  <Button
                    disabled
                    sx={{
                      justifyContent: 'flex-start',
                      color: '#777',
                      textTransform: 'none',
                      fontSize: 13,
                      p: 0,
                      width: 'fit-content',
                    }}
                  >
                    + Add New Service
                  </Button>
    
                  <Box>
                    <Typography sx={{ fontSize: 13, color: '#555', mb: 0.5 }}>
                      Proof of Downpayment <span style={{ color: 'red' }}>*</span>
                    </Typography>
    
                    <Box
                      sx={{
                        bgcolor: '#fff',
                        minHeight: 38,
                        display: 'flex',
                        alignItems: 'center',
                        px: 1.5,
                      }}
                    >
                      {selectedAppointment.paymentScreenshotUrl ? (
                        <Button
                          onClick={() => {
                            setImageViewerUrl(selectedAppointment.paymentScreenshotUrl || '');
                            setImageViewerTitle('Proof of Downpayment');
                            setImageViewerOpen(true);
                          }}
                          sx={{
                            p: 0,
                            color: '#3b82f6',
                            textTransform: 'none',
                            fontSize: 13,
                          }}
                        >
                          View Image
                        </Button>
                      ) : (
                        <Typography sx={{ color: '#999', fontSize: 13 }}>
                          No proof uploaded
                        </Typography>
                      )}
                    </Box>
                  </Box>
    
                  <TextField
                    select
                    label="Status *"
                    value={selectedAppointment.status}
                    disabled
                    size="small"
                    sx={{ bgcolor: '#fff' }}
                    onChange={(e) =>
                      setSelectedAppointment((prev) =>
                        prev ? { ...prev, status: e.target.value } : prev
                      )
                    }
                  >
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                    <MenuItem value="COMPLETED">Completed</MenuItem>
                    <MenuItem value="NOSHOW">No-show</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                  </TextField>
    
                  <Box>
                    <Typography sx={{ fontSize: 13, color: '#555', mb: 0.5 }}>
                      After Service Photos
                    </Typography>
    
                    <Box
                      sx={{
                        bgcolor: '#fff',
                        minHeight: 38,
                        display: 'flex',
                        alignItems: 'center',
                        px: 1.5,
                        gap: 1,
                      }}
                    >
                      {getAfterServicePhotos(selectedAppointment).length > 0 ? (
                        getAfterServicePhotos(selectedAppointment).map((photo, index) => (
                          <Button
                            key={photo.id || photo.imageUrl}
                            onClick={() => {
                              openImageViewer(
                                'After Service Photos',
                                getAfterServicePhotos(selectedAppointment),
                                index
                              );
                            }}
                            sx={{
                              p: 0,
                              color: '#3b82f6',
                              textTransform: 'none',
                              fontSize: 13,
                            }}
                          >
                            View Image {index + 1}
                          </Button>
                        ))
                      ) : (
                        <Typography sx={{ color: '#999', fontSize: 13 }}>
                          No after service photos
                        </Typography>
                      )}
                    </Box>

                    {canUploadAfterServicePhoto ? (
                      <Button
                        component="label"
                        sx={{
                          mt: 1,
                          bgcolor: '#fff',
                          color: '#555',
                          border: '1px solid #ccc',
                          textTransform: 'none',
                          fontSize: 13,
                          px: 2,
                        }}
                      >
                        + Upload After Service Photo
                        <input
                          hidden
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            const formData = new FormData();
                            formData.append('file', file);

                            try {
                              const uploadRes = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData,
                              });

                              const uploadText = await uploadRes.text();
                              console.log('UPLOAD STATUS:', uploadRes.status);
                              console.log('UPLOAD RAW RESPONSE:', uploadText);

                              let uploadData: any = {};
                              try {
                                uploadData = uploadText ? JSON.parse(uploadText) : {};
                              } catch (parseError) {
                                console.error('UPLOAD JSON PARSE ERROR:', parseError);
                              }

                              console.log('UPLOAD PARSED RESPONSE:', uploadData);

                              if (!uploadRes.ok || !uploadData.url) {
                                alert(uploadData.error || 'Failed to upload photo.');
                                return;
                              }

                              setPendingAfterServicePhotoUrls((prev) => [
                                ...prev,
                                uploadData.url,
                              ]);

                              setSelectedAppointment((prev) => {
                                if (!prev) return prev;

                                const newPhoto = {
                                  id: `temp-${Date.now()}`,
                                  imageUrl: uploadData.url,
                                  createdAt: new Date().toISOString(),
                                };

                                const updated = {
                                  ...prev,
                                  afterServicePhotoUrl: uploadData.url,
                                  afterServicePhotos: [
                                    newPhoto,
                                    ...(prev.afterServicePhotos || []),
                                  ],
                                };

                                console.log('PHOTO URL SET TO STATE:', uploadData.url);
                                console.log('UPDATED APPOINTMENT STATE:', updated);

                                return updated;
                              });
                            } catch (err) {
                              alert('Failed to upload photo.');
                            }
                          }}
                        />
                      </Button>
                    ) : (
                      <Typography sx={{ color: 'error.main', fontSize: 13, mt: 1 }}>
                        After-service photos can only be uploaded for completed appointments.
                      </Typography>
                    )}
                  </Box>
                </DialogContent>
    
                <DialogActions
                  sx={{
                    px: 3,
                    pb: 3,
                    justifyContent: 'center',
                    gap: 2,
                  }}
                >
                  <Button
                    onClick={() => {
                      setOpenEditModal(false);
                    }}
                    sx={{
                      backgroundColor: '#777',
                      color: '#f4b400',
                      width: 180,
                      minHeight: 44,
                      py: 1,
                      borderRadius: 1,
                      textTransform: 'none',
                      fontWeight: 700,
                      '&:hover': {
                        backgroundColor: '#666',
                      },
                    }}
                  >
                    Cancel
                  </Button>
    
                  <Button
                    onClick={handleUpdateAppointment}
                    disabled={!canUploadAfterServicePhoto || pendingAfterServicePhotoUrls.length === 0 || saving}
                    sx={{
                      backgroundColor: '#000',
                      color: '#f4b400',
                      width: 180,
                      minHeight: 44,
                      py: 1,
                      borderRadius: 1,
                      textTransform: 'none',
                      fontWeight: 700,
                      lineHeight: 1.1,
                      '&:hover': {
                        backgroundColor: '#111',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: '#ccc',
                        color: '#777',
                      },
                    }}
                  >
                    {saving ? 'Saving...' : pendingAfterServicePhotoUrls.length > 1 ? 'Save Photos' : 'Save Photo'}
                  </Button>
                </DialogActions>
              </>
            )}
          </Dialog>

          {/* UPLOAD SUCCESS MODAL */}
          <Dialog
            open={photoSuccessOpen}
            onClose={() => setPhotoSuccessOpen(false)}
          >
            <DialogTitle sx={{ fontWeight: 800 }}>
              Upload Confirmed
            </DialogTitle>

            <DialogContent>
              <Typography>
                {photoSuccessMessage}
              </Typography>
            </DialogContent>

            <DialogActions>
              <Button
                onClick={() => setPhotoSuccessOpen(false)}
                sx={{
                  bgcolor: '#000',
                  color: '#f4b400',
                  px: 4,
                  '&:hover': {
                    bgcolor: '#111',
                  },
                }}
              >
                OK
              </Button>
            </DialogActions>
          </Dialog>

          {/* IMAGE VIEWER */}
          <Dialog
            open={imageViewerOpen}
            onClose={() => setImageViewerOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle sx={{ fontWeight: 800 }}>
              {imageViewerTitle}
              {imageViewerPhotos.length > 1 && (
                <Typography component="span" sx={{ ml: 1, color: '#777', fontSize: 13 }}>
                  ({imageViewerIndex + 1} of {imageViewerPhotos.length})
                </Typography>
              )}

              <IconButton
                onClick={() => setImageViewerOpen(false)}
                sx={{ position: 'absolute', right: 12, top: 10 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent
              sx={{
                bgcolor: '#f5f5f5',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                p: 3,
              }}
            >
              {imageViewerUrl ? (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    <IconButton
                      disabled={imageViewerPhotos.length <= 1}
                      onClick={() => {
                        const nextIndex =
                          imageViewerIndex === 0
                            ? imageViewerPhotos.length - 1
                            : imageViewerIndex - 1;

                        setImageViewerIndex(nextIndex);
                        setImageViewerUrl(imageViewerPhotos[nextIndex]?.imageUrl || '');
                      }}
                      sx={{
                        bgcolor: '#fff',
                        border: '1px solid #ddd',
                        '&:hover': { bgcolor: '#eee' },
                      }}
                    >
                      <ChevronLeftIcon />
                    </IconButton>

                    <Box
                      component="img"
                      src={imageViewerUrl}
                      alt={imageViewerTitle || 'Appointment image'}
                      sx={{
                        width: '100%',
                        maxWidth: 820,
                        maxHeight: '68vh',
                        objectFit: 'contain',
                        borderRadius: 2,
                        bgcolor: '#fff',
                      }}
                    />

                    <IconButton
                      disabled={imageViewerPhotos.length <= 1}
                      onClick={() => {
                        const nextIndex =
                          imageViewerIndex === imageViewerPhotos.length - 1
                            ? 0
                            : imageViewerIndex + 1;

                        setImageViewerIndex(nextIndex);
                        setImageViewerUrl(imageViewerPhotos[nextIndex]?.imageUrl || '');
                      }}
                      sx={{
                        bgcolor: '#fff',
                        border: '1px solid #ddd',
                        '&:hover': { bgcolor: '#eee' },
                      }}
                    >
                      <ChevronRightIcon />
                    </IconButton>
                  </Box>

                  {imageViewerPhotos.length > 1 && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                      }}
                    >
                      {imageViewerPhotos.map((photo, index) => (
                        <Box
                          key={photo.id || photo.imageUrl}
                          component="img"
                          src={photo.imageUrl}
                          alt={`Thumbnail ${index + 1}`}
                          onClick={() => {
                            setImageViewerIndex(index);
                            setImageViewerUrl(photo.imageUrl);
                          }}
                          sx={{
                            width: 76,
                            height: 58,
                            objectFit: 'cover',
                            borderRadius: 1,
                            cursor: 'pointer',
                            border:
                              index === imageViewerIndex
                                ? '2px solid #000'
                                : '1px solid #ccc',
                            bgcolor: '#fff',
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </>
              ) : (
                <Typography sx={{ color: '#777', textAlign: 'center' }}>
                  No image available.
                </Typography>
              )}
            </DialogContent>
          </Dialog>

    </Box>
  );
}