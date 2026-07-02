'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toPHDateKey } from '@/lib/dateUtils';
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Pagination from '@mui/material/Pagination';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';

import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from "@mui/icons-material/Settings";

interface Appointment {
  id: string;
  appointmentCode: string;
  customerCode: string;
  customerName: string;
  customerId?: string;
  schedule: string;
  appointmentDate?: string;
  startMinutes?: number;
  endMinutes?: number;
  serviceId?: string;
  serviceName: string;
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

interface CustomerOption {
  id: string;
  customerCode: string;
  name: string;
  isActive: boolean;
}

interface BarberOption {
  id: string;
  name: string;
}

interface ServiceOption {
  id: string;
  name: string;
  price?: number;
  durationMinutes?: number;
}

interface AvailableTime {
  startMinutes: number;
  endMinutes: number;
  label: string;
}

interface AppointmentSettings {
  bookingCutoffHours: number;
}
const readOnlyStatuses = ['COMPLETED', 'NOSHOW', 'CANCELLED', 'REJECTED'];

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const itemsPerPage = 4;

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function getAppointmentScheduleValue(appointment: Appointment) {
  const dateValue = appointment.appointmentDate
    ? new Date(appointment.appointmentDate).getTime()
    : 0;

  if (Number.isNaN(dateValue)) return 0;

  return dateValue + (appointment.startMinutes ?? 0) * 60_000;
}

function compareNewestScheduleFirst(a: Appointment, b: Appointment) {
  return getAppointmentScheduleValue(b) - getAppointmentScheduleValue(a);
}

export default function AppointmentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [warningOpen, setWarningOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const showWarning = (message: string) => {
    setWarningMessage(message);
    setWarningOpen(true);
  };
  
  const [originalAppointmentStatus, setOriginalAppointmentStatus] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const supabase = createClient()
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [pendingPage, setPendingPage] = useState(1);
  const [processedPage, setProcessedPage] = useState(1);

  const [processedSearch, setProcessedSearch] = useState('');
  const [processedStatusFilter, setProcessedStatusFilter] = useState('ALL');

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [openCalendarModal, setOpenCalendarModal] = useState(false);

  const [openDayViewModal, setOpenDayViewModal] = useState(false);
  const [dayViewDate, setDayViewDate] = useState(new Date());
  const [openEditDayModal, setOpenEditDayModal] = useState(false);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openEditScheduleModal, setOpenEditScheduleModal] = useState(false);

  // Settings
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [bookingCutoffHours, setBookingCutoffHours] = useState<number>(1);

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [addForm, setAddForm] = useState({
    customerId: '',
    barberId: '',
    serviceId: '',
    appointmentDate: '',
    startMinutes: '',
    endMinutes: '',
  });

  const [addStep, setAddStep] = useState(1);
  const [selectedAddCustomer, setSelectedAddCustomer] =
    useState<CustomerOption | null>(null);
  const [selectedAddService, setSelectedAddService] =
    useState<ServiceOption | null>(null);
  const [addProof, setAddProof] = useState<File | null>(null);
  const [afterServicePhoto, setAfterServicePhoto] = useState<File | null>(null);

  const [addCurrentMonth, setAddCurrentMonth] = useState(new Date());
  const [selectedAddDate, setSelectedAddDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<AvailableTime | null>(null);
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(
    new Set()
  );

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState('');
  const [imageViewerTitle, setImageViewerTitle] = useState('');
  const [imageViewerPhotos, setImageViewerPhotos] = useState<string[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const servicePrice = Number(selectedAddService?.price || 0);

  const getSelectedServiceDuration = () => {
    if (openEditScheduleModal && selectedAppointment?.serviceId) {
      const service = services.find(
        (service) => service.id === selectedAppointment.serviceId
      );

      return Number(service?.durationMinutes || 0);
    }

    return Number(selectedAddService?.durationMinutes || 0);
  };

  const openImageViewer = (title: string, photos: string[], startIndex = 0) => {
    const validPhotos = photos.filter(Boolean);

    if (validPhotos.length === 0) {
      setImageViewerTitle(title);
      setImageViewerPhotos([]);
      setImageViewerIndex(0);
      setImageViewerUrl('');
      setImageViewerOpen(true);
      return;
    }

    const safeIndex = Math.min(Math.max(startIndex, 0), validPhotos.length - 1);

    setImageViewerTitle(title);
    setImageViewerPhotos(validPhotos);
    setImageViewerIndex(safeIndex);
    setImageViewerUrl(validPhotos[safeIndex]);
    setImageViewerOpen(true);
  };

  const isReadOnly =
    !!originalAppointmentStatus &&
    !['PENDING', 'SCHEDULED'].includes(originalAppointmentStatus.toUpperCase());

  const addCalendarDays = (() => {
    const year = addCurrentMonth.getFullYear();
    const month = addCurrentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);

    for (let day = 1; day <= totalDays; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  })();

  const resetAddModal = () => {
    setOpenAddModal(false);
    setAddStep(1);
    setSelectedAddCustomer(null);
    setSelectedAddService(null);
    setAddProof(null);
    setSelectedAddDate(null);
    setSelectedTime(null);
    setAvailableTimes([]);
    setLoadingTimes(false);
    setUnavailableDates(new Set());
    setAddCurrentMonth(new Date());
    setServices([]);

    setAddForm({
      customerId: '',
      barberId: '',
      serviceId: '',
      appointmentDate: '',
      startMinutes: '',
      endMinutes: '',
    });
  };

  const formatMinutes = (minutes?: number) => {
    if (minutes === undefined || minutes === null) return '';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;

    return `${displayHour}:${String(mins).padStart(2, '0')} ${period}`;
  };

  const formatAmount = (amount: number | string | null) => {
    if (amount === null || amount === undefined) return '-';

    const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (Number.isNaN(parsed)) return '-';

    return `₱ ${parsed.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    const normalized = status.toUpperCase();

    if (normalized === 'COMPLETED') return 'green';
    if (normalized === 'CANCELLED') return '#EA580C';
    if (normalized === 'REJECTED') return '#DC2626';
    if (normalized === 'NOSHOW') return '#1F2937';
    if (normalized === 'PENDING') return '#92400E';
    if (normalized === 'SCHEDULED') return '#2563eb';

    return '#333';
  };

  const {
    data: appointments = [],
    isLoading: loading,
    isError: appointmentsError,
  } = useQuery<Appointment[]>({
    queryKey: ['adminAppointments'],
    queryFn: async () => {
      const res = await fetch('/api/admin/appointments', {
        cache: 'no-store',
      });

      if (res.status === 403) {
        router.push('/unauthorized');
        return [];
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to load appointments.');
      }

      setSettings(data.settings || null);

      if (data.settings) {
        setBookingCutoffHours(data.settings.bookingCutoffHours);
      }

      setError('');

      return (data.appointments || []).map((appointment: any) => ({
        id: appointment.id,
        appointmentCode: appointment.appointmentCode || '',
        customerId: appointment.customerId,
        customerCode: appointment.customer?.customerCode || '',
        customerName:
          appointment.customer?.name ||
          [appointment.customer?.firstName, appointment.customer?.lastName]
            .filter(Boolean)
            .join(' ') ||
          '',
        schedule:
          appointment.schedule?.formatted ||
          appointment.schedule ||
          '',
        appointmentDate: appointment.appointmentDate || '',
        startMinutes: appointment.startMinutes,
        endMinutes: appointment.endMinutes,
        barberId: appointment.barberId,
        barberName:
          appointment.barber?.name ||
          [appointment.barber?.firstName, appointment.barber?.lastName]
            .filter(Boolean)
            .join(' ') ||
          '',
        serviceId: appointment.serviceId,
        serviceName: appointment.service?.name || '',
        totalAmount:
          appointment.payment?.amount !== undefined &&
          appointment.payment?.amount !== null
            ? appointment.payment.amount
            : null,
        status: appointment.status || '',
        paymentScreenshotUrl: appointment.payment?.screenshotUrl || null,
        afterServicePhotos: appointment.afterServicePhotos || [],
        afterServicePhotoUrl:
          appointment.afterServicePhotoUrl ||
          appointment.afterServicePhotos?.[0]?.imageUrl ||
          null,
      }));
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (appointmentsError) {
      setError('Unable to load appointments.');
    }
  }, [appointmentsError]);

  const loadOptions = async () => {
  try {
    const [customersRes, barbersRes] = await Promise.all([
      fetch('/api/customers', { cache: 'no-store' }),
      fetch('/api/appointment/barbers', { cache: 'no-store' }),
    ]);

    const customersData = await customersRes.json();
    const barbersData = await barbersRes.json();

    const customersArray = Array.isArray(customersData?.customers)
      ? customersData.customers
      : Array.isArray(customersData)
      ? customersData
      : [];

    const barbersArray = Array.isArray(barbersData?.barbers)
      ? barbersData.barbers
      : Array.isArray(barbersData)
      ? barbersData
      : [];

    setCustomers(
      customersArray
        .filter((c: any) => c.isActive !== false)
        .map((c: any) => ({
          id: c.id,
          customerCode: c.customerCode || '',
          name:
            c.name ||
            [c.firstName, c.lastName].filter(Boolean).join(' ') ||
            c.email ||
            'Unknown Customer',
          isActive: c.isActive ?? true,
        }))
    );

    setBarbers(
      barbersArray.map((b: any) => ({
        id: b.id,
        name:
          b.name ||
          [b.firstName, b.lastName].filter(Boolean).join(' ') ||
          b.email ||
          'Unknown Barber',
      }))
    );
  } catch (error) {
    console.error('LOAD OPTIONS ERROR:', error);
  }
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
          durationMinutes: Number(s.durationMinutes || 0),
        }))
      );
    } catch (error) {
      console.error('LOAD SERVICES ERROR:', error);
      setServices([]);
    }
  };

  const fetchAvailability = async (date: Date) => {
    const barberId = openEditScheduleModal
      ? selectedAppointment?.barberId
      : addForm.barberId;

    const serviceId = openEditScheduleModal
      ? selectedAppointment?.serviceId
      : addForm.serviceId;

    if (!barberId || !serviceId) {
      setAvailableTimes([]);
      return;
    }

    try {
      setLoadingTimes(true);
      setAvailableTimes([]);

      const formattedDate = formatDateInput(date);

      const response = await fetch(
        `/api/admin/barbers/availability?barberId=${barberId}&serviceId=${serviceId}&date=${formattedDate}&blockedSlots=`
      );

      const data = await response.json();

     const times = data?.availableTimes ?? [];

    setAvailableTimes(times);

    if (times.length === 0) {
      setUnavailableDates((prev) => {
        const updated = new Set(prev);
        updated.add(formattedDate);
        return updated;
      });

      setAddForm((prev) => ({
        ...prev,
        appointmentDate: '',
        startMinutes: '',
        endMinutes: '',
      }));

      setSelectedTime(null);
    }
      setSelectedTime(null);
    } catch (error) {
      console.error(error);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  const fetchUnavailableDates = async (month: Date) => {
    const barberId = openEditScheduleModal
      ? selectedAppointment?.barberId
      : addForm.barberId;

    if (!barberId) {
      setUnavailableDates(new Set());
      return;
    }

    try {
      const year = month.getFullYear();
      const m = String(month.getMonth() + 1).padStart(2, '0');

      const response = await fetch(
        `/api/admin/barbers/unavailable-dates?barberId=${barberId}&year=${year}&month=${m}`
      );

      const data = await response.json();

      setUnavailableDates(new Set(data?.unavailableDates ?? []));
    } catch (error) {
      console.error(error);
      setUnavailableDates(new Set());
    }
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

          if (!['OWNER', 'RECEPTIONIST'].includes(data.role)) {
            router.push('/unauthorized')
            return
          }
        
      loadOptions();
      } catch (err) {
        console.error("Initialization failed:", err)
      }
    }
    init()
  }, [router]);

  useEffect(() => {
    fetchUnavailableDates(addCurrentMonth);
  }, [addCurrentMonth, addForm.barberId, selectedAppointment?.barberId, openEditScheduleModal]);

  useEffect(() => {
    if (!selectedAddDate) return;

    fetchAvailability(selectedAddDate);
  }, [
    selectedAddDate,
    addForm.barberId,
    addForm.serviceId,
    selectedAppointment?.barberId,
    selectedAppointment?.serviceId,
    openEditScheduleModal,
  ]);

  const filteredPendingAppointments = appointments
    .filter((appointment) => appointment.status.toUpperCase() === 'PENDING')
    .sort(compareNewestScheduleFirst);

  const processedBaseAppointments = appointments
    .filter((appointment) => appointment.status.toUpperCase() !== 'PENDING')
    .sort(compareNewestScheduleFirst);

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

      return matchesSearch && matchesStatus;
    }
  );

  const paginatedPendingAppointments = filteredPendingAppointments.slice(
    (pendingPage - 1) * itemsPerPage,
    pendingPage * itemsPerPage
  );

  const paginatedProcessedAppointments = filteredProcessedAppointments.slice(
    (processedPage - 1) * itemsPerPage,
    processedPage * itemsPerPage
  );

  const totalPagesPending = Math.ceil(
    filteredPendingAppointments.length / itemsPerPage
  );

  const totalPagesProcessed = Math.ceil(
    filteredProcessedAppointments.length / itemsPerPage
  );

  const handleAddAppointment = async () => {
    if (
      !addForm.customerId ||
      !addForm.barberId ||
      !addForm.serviceId ||
      !addForm.appointmentDate ||
      !addForm.startMinutes ||
      !addForm.endMinutes
    ) {
      showWarning('Please complete all required fields.');
      return;
    }

    const chosenCustomer = customers.find(
      (customer) => customer.id === addForm.customerId
    );

    if (!chosenCustomer?.isActive) {
      showWarning('Unavailable customer cannot be used for appointments.');
      return;
    }

    try {
      setSaving(true);

      let paymentScreenshotUrl: string | null = null;

      if (addProof) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', addProof);
        uploadFormData.append('bucket', 'payment-screenshots');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData.url) {
          showWarning(uploadData.error || 'Failed to upload proof image.');
          return;
        }

        paymentScreenshotUrl = uploadData.url;
      }

      const res = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: addForm.customerId,
          barberId: addForm.barberId,
          serviceId: addForm.serviceId,
          appointmentDate: addForm.appointmentDate,
          startMinutes: Number(addForm.startMinutes),
          endMinutes: Number(addForm.startMinutes) + getSelectedServiceDuration(),
          paymentScreenshotUrl,
          downPayment: 150,
          status: 'SCHEDULED',
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        showWarning(data.error || 'Failed to add appointment.');
        return;
      }

      resetAddModal();
      setSuccessMessage('Appointment successfully added!');
      setSuccessOpen(true);
      await queryClient.invalidateQueries({ queryKey: ['adminAppointments'] });
    } catch (error) {
      console.error('ADD APPOINTMENT ERROR:', error);
      showWarning('Failed to add appointment.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment || isReadOnly) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/admin/appointments/${selectedAppointment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barberId: selectedAppointment.barberId,
          serviceId: selectedAppointment.serviceId,
          appointmentDate: selectedAppointment.appointmentDate,
          startMinutes: selectedAppointment.startMinutes,
          endMinutes: selectedAppointment.endMinutes,
          status: selectedAppointment.status,
          afterServicePhotoUrl: selectedAppointment.afterServicePhotoUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showWarning(data.error || 'Failed to update appointment.');
        return;
      }

      setOpenEditModal(false);
      setSelectedAppointment(null);
      setSuccessMessage('Appointment successfully updated!');
      setSuccessOpen(true);
      await queryClient.invalidateQueries({ queryKey: ['adminAppointments'] });
    } catch (error) {
      console.error('UPDATE APPOINTMENT ERROR:', error);
      showWarning('Failed to update appointment.');
    } finally {
      setSaving(false);
    }
  };

  const renderAppointmentTable = (rows: Appointment[]) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
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
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center">
                No appointments found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((appointment) => (
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
                    color: getStatusColor(appointment.status),
                  }}
                >
                  {appointment.status}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={async () => {
                      setServices([]);

                      if (appointment.barberId) {
                        await loadServicesByBarber(appointment.barberId);
                      }

                      setSelectedAppointment(appointment);
                      setOriginalAppointmentStatus(appointment.status);
                      setOpenEditModal(true);
                    }}
                  >
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const AppointmentCalendar = ({
    appointments,
  }: {
    appointments: Appointment[];
  }) => {
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
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;

      return appointments.filter(
        (a) => toPHDateKey(a.appointmentDate) === dateStr
      );
    };

    const statusColorMap: Record<string, { bg: string; color: string }> = {
      PENDING: { bg: '#FEF3C7', color: '#92400E' },
      SCHEDULED: { bg: '#DBEAFE', color: '#1E40AF' },
      COMPLETED: { bg: '#D1FAE5', color: '#065f46' },
      CANCELLED: { bg: '#d81d1d', color: '#2b1515' },
      REJECTED: { bg: '#FEE2E2', color: '#DC2626' },
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
            <ChevronLeftIcon />
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
            <ChevronRightIcon />
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
                  '&:last-child': {
                    borderRight: 'none',
                  },
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
                    '&:nth-of-type(7n)': {
                      borderRight: 'none',
                    },
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
                           statusColorMap[appointment.status.toUpperCase()] ||
                          statusColorMap.NOSHOW;

                        return (
                          <Box
                            key={appointment.id}
                            title={`${appointment.customerName} - ${appointment.serviceName} (${appointment.barberName})`}
                            onClick={async () => {
                              setServices([]);

                              if (appointment.barberId) {
                                await loadServicesByBarber(appointment.barberId);
                              }

                              setSelectedAppointment(appointment);
                              setOriginalAppointmentStatus(appointment.status);
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
                              '&:hover': {
                                filter: 'brightness(0.92)',
                              },
                            }}
                          >
                            {formatMinutes(appointment.startMinutes)} -{' '}
                            {formatMinutes(appointment.endMinutes)}
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
          {Object.entries(statusColorMap).map(([label, colors]) => (
            <Box
              key={label}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '2px',
                  bgcolor: colors.bg,
                  border: `1px solid ${colors.color}`,
                }}
              />
              <Typography sx={{ fontSize: 11, color: '#777' }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const saveSettings = async () => {
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingCutoffHours,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSettingsOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['adminAppointments'] });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box sx={{ flex: 1, p: 4, backgroundColor: '#fff' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 4,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          Appointments
        </Typography>

        <IconButton onClick={() => setSettingsOpen(true)}>
          <SettingsIcon sx={{ fontSize: 32, color: "#111" }} />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mb: 4,
        }}
      >
        <Button
          startIcon={<AddIcon />}
          onClick={() => setOpenAddModal(true)}
          sx={{
            backgroundColor: '#000',
            color: '#fff',
            px: 3,
            py: 1,
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            '&:hover': {
              backgroundColor: '#222',
            },
          }}
        >
          Add Appointment
        </Button>
      </Box>
      

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : appointments.length === 0 ? (
        <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>
          No appointments found.
        </Typography>
      ) : (
        <>
        <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Pending appointments
        </Typography>

      </Box>

          {renderAppointmentTable(paginatedPendingAppointments)}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 3,
              mb: 4,
            }}
          >
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
              Showing {paginatedPendingAppointments.length} of{' '}
              {filteredPendingAppointments.length} entries
            </Typography>

            <Pagination
              count={totalPagesPending || 1}
              page={pendingPage}
              onChange={(_, value) => setPendingPage(value)}
              size="small"
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              mb: 2,
              flexWrap: 'wrap',
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
                <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
                <MenuItem value="NOSHOW">No-show</MenuItem>
              </TextField>
            </Box>

          {renderAppointmentTable(paginatedProcessedAppointments)}


          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 3,
            }}
          >
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
              Showing {paginatedProcessedAppointments.length} of{' '}
              {filteredProcessedAppointments.length} entries
            </Typography>

            <Pagination
              count={totalPagesProcessed || 1}
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

      {/* ADD MODAL */}
      <Dialog
        open={openAddModal}
        onClose={resetAddModal}
        fullWidth
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: addStep === 2 ? '1400px' : '700px',
              maxWidth: '95vw',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Add New Appointment
          <IconButton
            onClick={resetAddModal}
            sx={{ position: 'absolute', right: 12, top: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            pt: 2,
            bgcolor: '#f5f5f5',
          }}
        >
          {addStep === 1 && (
            <>
              <Typography sx={{ fontSize: 13, color: '#777' }}>
                Customer ID: {selectedAddCustomer?.customerCode || '—'}
              </Typography>

              <Autocomplete
                options={customers}
                value={selectedAddCustomer}
                forcePopupIcon={false}
                getOptionLabel={(option) =>
                  `${option.name} ${
                    option.customerCode ? `(${option.customerCode})` : ''
                  }`
                }
                onChange={(_, value) => {
                  setSelectedAddCustomer(value);
                  setAddForm((prev) => ({
                    ...prev,
                    customerId: value?.id || '',
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Name *"
                    placeholder="Enter name"
                    sx={{ bgcolor: '#fff' }}
                  />
                )}
              />

              <TextField
                select
                label="Barber *"
                value={addForm.barberId}
                sx={{ bgcolor: '#fff' }}
                onChange={(e) => {
                  const barberId = e.target.value;

                  setAddForm((prev) => ({
                    ...prev,
                    barberId,
                    serviceId: '',
                    appointmentDate: '',
                    startMinutes: '',
                    endMinutes: '',
                  }));

                  setSelectedAddService(null);
                  setSelectedAddDate(null);
                  setSelectedTime(null);
                  setAvailableTimes([]);
                  setServices([]);

                  loadServicesByBarber(barberId);
                }}
              >
                {barbers.map((barber) => (
                  <MenuItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Service *"
                value={addForm.serviceId}
                sx={{ bgcolor: '#fff' }}
                onChange={(e) => {
                  const serviceId = e.target.value;
                  const service =
                    services.find((service) => service.id === serviceId) ||
                    null;

                  setSelectedAddService(service);
                  setSelectedAddDate(null);
                  setSelectedTime(null);
                  setAvailableTimes([]);

                  setAddForm((prev) => ({
                    ...prev,
                    serviceId,
                    appointmentDate: '',
                    startMinutes: '',
                    endMinutes: '',
                  }));
                }}
              >
                {services.map((service) => (
                  <MenuItem key={service.id} value={service.id}>
                    {service.name}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}

          {addStep === 2 && (
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ width: 550 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() =>
                      setAddCurrentMonth((prev) =>
                        new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    sx={{
                      backgroundColor: '#fff',
                      border: '1px solid #d0d0d0',
                    }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>

                  <Typography sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
                    {addCurrentMonth.toLocaleString('default', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={() =>
                      setAddCurrentMonth((prev) =>
                        new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                    sx={{
                      backgroundColor: '#fff',
                      border: '1px solid #d0d0d0',
                    }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </Stack>

                <Box sx={{ border: '1px solid #7b7b7b', backgroundColor: '#fff' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
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
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {day}
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {addCalendarDays.map((date, index) => {
                      const day = date?.getDate();

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      const formattedDate = date ? formatDateInput(date) : '';
                      const isPastDate = date ? date < today : false;
                      const isUnavailable =
                        !!date && unavailableDates.has(formattedDate);

                      const isAvailable =
                        !!day && !isPastDate && !isUnavailable;

                      const isSelected =
                        selectedAddDate &&
                        date &&
                        selectedAddDate.toDateString() === date.toDateString();

                      return (
                        <Box
                          key={index}
                          onClick={() => {
                            if (date && !isPastDate && !isUnavailable && addForm.serviceId) {
                              setSelectedAddDate(date);
                              setSelectedTime(null);

                              setAddForm((prev) => ({
                                ...prev,
                                appointmentDate: formatDateInput(date),
                                startMinutes: '',
                                endMinutes: '',
                              }));
                            }
                          }}
                          sx={{
                            height: 68,
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
                          }}
                        >
                          {day && (
                            <>
                              <Typography
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  fontWeight: isSelected ? 700 : 500,
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
                                    height: 8,
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
                  border: '1px solid #7b7b7b',
                  backgroundColor: '#efefef',
                  minHeight: 530,
                }}
              >
                <Box sx={{ borderBottom: '1px solid #7b7b7b', py: 2 }}>
                  <Typography
                    align="center"
                    sx={{ fontWeight: 700, fontSize: '1.5rem' }}
                  >
                    Time
                  </Typography>
                </Box>

                <Box sx={{ py: 3 }}>
                  <Typography
                    align="center"
                    sx={{ fontSize: '2rem', fontWeight: 500 }}
                  >
                    {selectedAddDate
                      ? selectedAddDate.toLocaleDateString('en-US', {
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
                    px: 3,
                  }}
                >
                  {loadingTimes && (
                    <Typography sx={{ width: '100%', textAlign: 'center' }}>
                      Loading times...
                    </Typography>
                  )}

                  {!loadingTimes &&
                    selectedAddDate &&
                    availableTimes.length === 0 && (
                      <Typography sx={{ width: '100%', textAlign: 'center' }}>
                        No available times.
                      </Typography>
                    )}

                  {availableTimes.map((time) => {
                    const selected =
                      selectedTime?.startMinutes === time.startMinutes;

                    return (
                      <Button
                        key={time.label}
                        onClick={() => {

                          const endMinutes =
                            time.startMinutes + getSelectedServiceDuration();

                          setSelectedTime({
                            startMinutes: time.startMinutes,
                            endMinutes,
                            label: `${formatMinutes(time.startMinutes)} - ${formatMinutes(endMinutes)}`,
                          });

                          setAddForm((prev) => ({
                            ...prev,
                            startMinutes: String(time.startMinutes),
                            endMinutes: String(endMinutes),
                          }));
                        }}
                        variant="outlined"
                        sx={{
                          minWidth: 180,
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
                        {`${formatMinutes(time.startMinutes)} - ${formatMinutes(
                          time.startMinutes + getSelectedServiceDuration()
                        )}`}
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          )}

          {addStep === 3 && (
            <>
              <Box sx={{ bgcolor: '#fff', border: '1px solid #eee' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px',
                    p: 1.5,
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: '#999' }}>
                    Service Summary
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: '#999' }}>
                    Price
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px',
                    p: 1.5,
                  }}
                >
                  <Typography>{selectedAddService?.name || '-'}</Typography>
                  <Typography>₱ {servicePrice.toFixed(2)}</Typography>
                </Box>
              </Box>

              <Box sx={{ bgcolor: '#fff', p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontWeight: 900 }}>Subtotal</Typography>
                  <Typography>₱ {servicePrice.toFixed(2)}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontWeight: 900 }}>Downpayment To Pay</Typography>
                  <Typography>₱ 150.00</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 900 }}>Total</Typography>
                  <Typography>₱ {servicePrice.toFixed(2)}</Typography>
                </Box>
              </Box>

              <Typography sx={{ color: '#777', fontSize: 13 }}>
                Proof of Downpayment <span style={{ color: 'red' }}>*</span>
              </Typography>

              <Button
                component="label"
                sx={{
                  bgcolor: '#fff',
                  color: '#999',
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  py: 1.3,
                }}
              >
                + {addProof ? addProof.name : 'Add Image'}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAddProof(e.target.files?.[0] || null)}
                />
              </Button>
            </>
          )}

          {addStep === 4 && (
            <>
              <Typography sx={{ fontSize: 13 }}>
                Are you sure you want to add the following appointment?
              </Typography>

              <Typography sx={{ fontSize: 13, color: '#777' }}>
                Customer ID: {selectedAddCustomer?.customerCode || '—'}
              </Typography>

              <TextField
                value={selectedAddCustomer?.name || ''}
                disabled
                sx={{ bgcolor: '#fff' }}
              />

              <TextField
                value={barbers.find((b) => b.id === addForm.barberId)?.name || ''}
                disabled
                sx={{ bgcolor: '#fff' }}
              />

              <TextField
                value={`${addForm.appointmentDate} ${formatMinutes(
                  Number(addForm.startMinutes)
                )} - ${formatMinutes(Number(addForm.endMinutes))}`}
                disabled
                sx={{ bgcolor: '#fff' }}
              />

              <Box sx={{ bgcolor: '#fff', p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 700, color: '#999' }}>
                    Service Summary
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: '#999' }}>
                    Price
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography>{selectedAddService?.name}</Typography>
                  <Typography>₱ {servicePrice.toFixed(2)}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Typography sx={{ fontWeight: 900 }}>Subtotal</Typography>
                  <Typography>₱ {servicePrice.toFixed(2)}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 900 }}>
                    Downpayment To Pay
                  </Typography>
                  <Typography>₱ 150.00</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 900 }}>Total</Typography>
                  <Typography>₱ {servicePrice.toFixed(2)}</Typography>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
          <Button
            onClick={() => {
              if (addStep === 1) {
                resetAddModal();
              } else {
                setAddStep((prev) => prev - 1);
              }
            }}
            sx={{ backgroundColor: '#777', color: '#f4b400', px: 4 }}
          >
            Cancel
          </Button>

          <Button
            disabled={saving}
            onClick={() => {
              if (addStep === 1) {
                if (!addForm.customerId || !addForm.barberId || !addForm.serviceId) {
                  showWarning('Please complete all required fields.');
                  return;
                }

                setAddStep(2);
                return;
              }

              if (addStep === 2) {
                if (
                  !addForm.appointmentDate ||
                  !addForm.startMinutes ||
                  !addForm.endMinutes
                ) {
                  showWarning('Please complete the schedule.');
                  return;
                }

                setAddStep(3);
                return;
              }

              if (addStep === 3) {
                if (!addProof) {
                  showWarning('Please upload proof of downpayment.');
                  return;
                }

                setAddStep(4);
                return;
              }

              handleAddAppointment();
            }}
            sx={{ backgroundColor: '#000', color: '#f4b400', px: 4 }}
          >
            {saving ? 'Saving...' : addStep === 4 ? 'Confirm Appointment' : 'Next'}
          </Button>
        </DialogActions>
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
                disabled={!!isReadOnly}
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
                {barbers.map((barber) => (
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
                disabled={!!isReadOnly}
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
                  disabled={!!isReadOnly}
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
                      onClick={() =>
                        openImageViewer(
                          'Proof of Downpayment',
                          [selectedAppointment.paymentScreenshotUrl || '']
                        )
                      }
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
                disabled={originalAppointmentStatus.toUpperCase() !== 'PENDING'}
                size="small"
                sx={{
                  bgcolor:
                    originalAppointmentStatus.toUpperCase() !== 'PENDING'
                      ? '#e5e5e5'
                      : '#fff',
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: '#777',
                  },
                }}
                onChange={(e) =>
                  setSelectedAppointment((prev) =>
                    prev ? { ...prev, status: e.target.value } : prev
                  )
                }
              >
                {originalAppointmentStatus.toUpperCase() === 'PENDING' ? (
                  [
                    <MenuItem key="PENDING" value="PENDING">
                      Pending
                    </MenuItem>,
                    <MenuItem key="SCHEDULED" value="SCHEDULED">
                      Scheduled
                    </MenuItem>,
                    <MenuItem key="REJECTED" value="REJECTED">
                      Rejected
                    </MenuItem>,
                  ]
                ) : (
                  <MenuItem value={selectedAppointment.status}>
                    {selectedAppointment.status}
                  </MenuItem>
                )}
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
                  {(
                    selectedAppointment.afterServicePhotos?.length
                      ? selectedAppointment.afterServicePhotos
                      : selectedAppointment.afterServicePhotoUrl
                      ? [{ id: 'legacy-photo', imageUrl: selectedAppointment.afterServicePhotoUrl }]
                      : []
                  ).length > 0 ? (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {(
                        selectedAppointment.afterServicePhotos?.length
                          ? selectedAppointment.afterServicePhotos
                          : [{ id: 'legacy-photo', imageUrl: selectedAppointment.afterServicePhotoUrl || '' }]
                      ).map((photo, index) => (
                        <Button
                          key={photo.id || `${photo.imageUrl}-${index}`}
                          onClick={() => {
                            const photoUrls = (
                              selectedAppointment.afterServicePhotos?.length
                                ? selectedAppointment.afterServicePhotos
                                : [
                                    {
                                      id: 'legacy-photo',
                                      imageUrl: selectedAppointment.afterServicePhotoUrl || '',
                                    },
                                  ]
                            ).map((item) => item.imageUrl);

                            openImageViewer('After Service Photos', photoUrls, index);
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
                      ))}
                    </Box>
                  ) : (
                    <Typography sx={{ color: '#999', fontSize: 13 }}>
                      No after service photos
                    </Typography>
                  )}
                </Box>
              </Box>

              {originalAppointmentStatus.toUpperCase() !== 'PENDING' && (
                <Typography sx={{ color: 'error.main', fontSize: 13 }}>
                  Processed appointment status is view-only here. Completed,
                  Cancelled, and No-show are handled in Sales.
                </Typography>
              )}
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
                disabled={saving || !!isReadOnly}
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
                {saving ? 'Saving...' : isReadOnly ? 'View Only' : 'Edit Appointment'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* EDIT SCHEDULE MODAL */}
      <Dialog
        open={openEditScheduleModal}
        onClose={() => setOpenEditScheduleModal(false)}
        fullWidth
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: '1400px',
              maxWidth: '95vw',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Change Schedule

          <IconButton
            onClick={() => setOpenEditScheduleModal(false)}
            sx={{ position: 'absolute', right: 12, top: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ bgcolor: '#f5f5f5' }}>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box sx={{ width: 550 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <IconButton
                  size="small"
                  onClick={() =>
                    setAddCurrentMonth((prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                  }
                  sx={{
                    backgroundColor: '#fff',
                    border: '1px solid #d0d0d0',
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>

                <Typography sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
                  {addCurrentMonth.toLocaleString('default', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Typography>

                <IconButton
                  size="small"
                  onClick={() =>
                    setAddCurrentMonth((prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                  sx={{
                    backgroundColor: '#fff',
                    border: '1px solid #d0d0d0',
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Stack>

              <Box sx={{ border: '1px solid #7b7b7b', backgroundColor: '#fff' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
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
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {day}
                    </Box>
                  ))}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {addCalendarDays.map((date, index) => {
                    const day = date?.getDate();

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const formattedDate = date ? formatDateInput(date) : '';
                    const isPastDate = date ? date < today : false;
                    const isUnavailable =
                      !!date && unavailableDates.has(formattedDate);

                    const isAvailable = !!day && !isPastDate && !isUnavailable;

                    const isSelected =
                      selectedAddDate &&
                      date &&
                      selectedAddDate.toDateString() === date.toDateString();

                    return (
                      <Box
                        key={index}
                        onClick={() => {
                          if (date && !isPastDate && !isUnavailable) {
                            setSelectedAddDate(date);
                            setSelectedTime(null);

                            setSelectedAppointment((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    appointmentDate: formatDateInput(date),
                                    startMinutes: undefined,
                                    endMinutes: undefined,
                                  }
                                : prev
                            );

                            fetchAvailability(date);
                          }
                        }}
                        sx={{
                          height: 68,
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
                        }}
                      >
                        {day && (
                          <>
                            <Typography
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                fontWeight: isSelected ? 700 : 500,
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
                                  height: 8,
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
                border: '1px solid #7b7b7b',
                backgroundColor: '#efefef',
                minHeight: 530,
              }}
            >
              <Box sx={{ borderBottom: '1px solid #7b7b7b', py: 2 }}>
                <Typography
                  align="center"
                  sx={{ fontWeight: 700, fontSize: '1.5rem' }}
                >
                  Time
                </Typography>
              </Box>

              <Box sx={{ py: 3 }}>
                <Typography align="center" sx={{ fontSize: '2rem', fontWeight: 500 }}>
                  {selectedAddDate
                    ? selectedAddDate.toLocaleDateString('en-US', {
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
                  px: 3,
                }}
              >
                {loadingTimes && (
                  <Typography sx={{ width: '100%', textAlign: 'center' }}>
                    Loading times...
                  </Typography>
                )}

                {!loadingTimes && selectedAddDate && availableTimes.length === 0 && (
                  <Typography sx={{ width: '100%', textAlign: 'center' }}>
                    No available times.
                  </Typography>
                )}

                {availableTimes.map((time) => {
                  const selected = selectedTime?.startMinutes === time.startMinutes;

                  return (
                    <Button
                      key={time.label}
                      onClick={() => {
                        const duration = getSelectedServiceDuration();
                        const endMinutes = time.startMinutes + duration;
                        const label = `${formatMinutes(
                          time.startMinutes
                        )} - ${formatMinutes(endMinutes)}`;

                        setSelectedTime({
                          startMinutes: time.startMinutes,
                          endMinutes,
                          label,
                        });

                        const selectedDateText = selectedAddDate
                          ? selectedAddDate.toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '';

                        setSelectedAppointment((prev) =>
                          prev
                            ? {
                                ...prev,
                                appointmentDate: selectedAddDate
                                  ? formatDateInput(selectedAddDate)
                                  : prev.appointmentDate,
                                startMinutes: time.startMinutes,
                                endMinutes,
                                schedule: `${selectedDateText} ${label}`,
                              }
                            : prev
                        );

                        setOpenEditScheduleModal(false);
                      }}
                      variant="outlined"
                      sx={{
                        minWidth: 180,
                        height: 48,
                        borderRadius: 2,
                        border: selected ? '2px solid #000' : '1px solid #d5d5d5',
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
                      {`${formatMinutes(time.startMinutes)} - ${formatMinutes(
                        time.startMinutes + getSelectedServiceDuration()
                      )}`}
                    </Button>
                  );
                })}
              </Box>
            </Box> 
          </Box>
        </DialogContent>
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
                disabled={!!isReadOnly}
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
                {barbers.map((barber) => (
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
                disabled={!!isReadOnly}
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
                  disabled={!!isReadOnly}
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
                      onClick={() =>
                        openImageViewer(
                          'Proof of Downpayment',
                          [selectedAppointment.paymentScreenshotUrl || '']
                        )
                      }
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
                disabled={originalAppointmentStatus.toUpperCase() !== 'PENDING'}
                size="small"
                sx={{
                  bgcolor:
                    originalAppointmentStatus.toUpperCase() !== 'PENDING'
                      ? '#e5e5e5'
                      : '#fff',
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: '#777',
                  },
                }}
                onChange={(e) =>
                  setSelectedAppointment((prev) =>
                    prev ? { ...prev, status: e.target.value } : prev
                  )
                }
              >
                {originalAppointmentStatus.toUpperCase() === 'PENDING' ? (
                  [
                    <MenuItem key="PENDING" value="PENDING">
                      Pending
                    </MenuItem>,
                    <MenuItem key="SCHEDULED" value="SCHEDULED">
                      Scheduled
                    </MenuItem>,
                    <MenuItem key="REJECTED" value="REJECTED">
                      Rejected
                    </MenuItem>,
                  ]
                ) : (
                  <MenuItem value={selectedAppointment.status}>
                    {selectedAppointment.status}
                  </MenuItem>
                )}
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
                  {(
                    selectedAppointment.afterServicePhotos?.length
                      ? selectedAppointment.afterServicePhotos
                      : selectedAppointment.afterServicePhotoUrl
                      ? [{ id: 'legacy-photo', imageUrl: selectedAppointment.afterServicePhotoUrl }]
                      : []
                  ).length > 0 ? (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {(
                        selectedAppointment.afterServicePhotos?.length
                          ? selectedAppointment.afterServicePhotos
                          : [{ id: 'legacy-photo', imageUrl: selectedAppointment.afterServicePhotoUrl || '' }]
                      ).map((photo, index) => (
                        <Button
                          key={photo.id || `${photo.imageUrl}-${index}`}
                          onClick={() => {
                            const photoUrls = (
                              selectedAppointment.afterServicePhotos?.length
                                ? selectedAppointment.afterServicePhotos
                                : [
                                    {
                                      id: 'legacy-photo',
                                      imageUrl: selectedAppointment.afterServicePhotoUrl || '',
                                    },
                                  ]
                            ).map((item) => item.imageUrl);

                            openImageViewer('After Service Photos', photoUrls, index);
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
                      ))}
                    </Box>
                  ) : (
                    <Typography sx={{ color: '#999', fontSize: 13 }}>
                      No after service photos
                    </Typography>
                  )}
                </Box>
              </Box>

              {originalAppointmentStatus.toUpperCase() !== 'PENDING' && (
                <Typography sx={{ color: 'error.main', fontSize: 13 }}>
                  Processed appointment status is view-only here. Completed,
                  Cancelled, and No-show are handled in Sales.
                </Typography>
              )}
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
                disabled={saving || !!isReadOnly}
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
                {saving ? 'Saving...' : isReadOnly ? 'View Only' : 'Edit Appointment'}
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
            const dateStr = toPHDateKey(dayViewDate);
            const dayAppointments = appointments.filter(
              (a) => toPHDateKey(a.appointmentDate) === dateStr
            );

            const hours = Array.from({ length: 11 }, (_, i) => i + 10); // 8 AM to 8 PM

            const statusColorMap: Record<string, { bg: string; color: string }> = {
              PENDING: { bg: '#FEF3C7', color: '#92400E' },
              SCHEDULED: { bg: '#DBEAFE', color: '#1E40AF' },
              COMPLETED: { bg: '#D1FAE5', color: '#065F46' },
              CANCELLED: { bg: '#FFEDD5', color: '#EA580C' },
              REJECTED: { bg: '#FEE2E2', color: '#DC2626' },
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
                          const statusColorMap: Record<string, { bg: string; color: string }> = {
                            PENDING: { bg: '#FEF3C7', color: '#92400E' },
                            SCHEDULED: { bg: '#DBEAFE', color: '#1E40AF' },
                            COMPLETED: { bg: '#D1FAE5', color: '#065F46' },
                            CANCELLED: { bg: '#FFEDD5', color: '#EA580C' },
                            REJECTED: { bg: '#FEE2E2', color: '#DC2626' },
                            NOSHOW: { bg: '#E5E7EB', color: '#1F2937' },
                          };
                          const colors = statusColorMap[appt.status.toUpperCase()] || statusColorMap.NOSHOW;

                          return (
                            <Box
                              key={appt.id}
                              onClick={async () => {
                                setServices([]);
                                if (appt.barberId) {
                                  await loadServicesByBarber(appt.barberId);
                                }
                                setSelectedAppointment(appt);
                                setOpenDayViewModal(false);
                                setOriginalAppointmentStatus(appt.status);
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
                                  {formatMinutes(appt.startMinutes)} - {formatMinutes(appt.endMinutes)}
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

                        {/* Ghost/muted appointments that START before this hour but span into it */}
                        {dayAppointments
                          .filter((a) => {
                            const start = a.startMinutes ?? 0;
                            const end = a.endMinutes ?? 0;
                            return start < hour * 60 && end > hour * 60;
                          })
                          .map((appt) => {
                            const statusColorMap: Record<string, { bg: string; color: string }> = {
                              PENDING: { bg: '#FEF3C7', color: '#92400E' },
                              SCHEDULED: { bg: '#DBEAFE', color: '#1E40AF' },
                              COMPLETED: { bg: '#D1FAE5', color: '#065F46' },
                              CANCELLED: { bg: '#FFEDD5', color: '#EA580C' },
                              REJECTED: { bg: '#FEE2E2', color: '#DC2626' },
                              NOSHOW: { bg: '#E5E7EB', color: '#1F2937' },
                            };
                            const colors = statusColorMap[appt.status.toUpperCase()] || statusColorMap.NOSHOW;

                            return (
                              <Box
                                key={`ghost-${appt.id}-${hour}`}
                                onClick={async () => {
                                  setServices([]);
                                  if (appt.barberId) {
                                    await loadServicesByBarber(appt.barberId);
                                  }
                                  setSelectedAppointment(appt);
                                  setOpenDayViewModal(false);
                                  setOpenEditDayModal(true);
                                }}
                                sx={{
                                  bgcolor: colors.bg,
                                  color: colors.color,
                                  border: `1px solid ${colors.color}`,
                                  opacity: 0.9,
                                  borderRadius: 1,
                                  px: 1.5,
                                  py: 0.5,
                                  mb: 0.5,
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  '&:hover': { opacity: 0.8 },
                                }}
                              >
                                {formatMinutes(appt.startMinutes)} - {formatMinutes(appt.endMinutes)}{' '}
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

      {/* IMAGE VIEWER MODAL */}
      <Dialog
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {imageViewerTitle || 'Image Viewer'}
          {imageViewerPhotos.length > 1 && (
            <Typography component="span" sx={{ ml: 1, fontSize: 13, color: '#777' }}>
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
                {imageViewerPhotos.length > 1 && (
                  <IconButton
                    onClick={() => {
                      const nextIndex =
                        imageViewerIndex === 0
                          ? imageViewerPhotos.length - 1
                          : imageViewerIndex - 1;

                      setImageViewerIndex(nextIndex);
                      setImageViewerUrl(imageViewerPhotos[nextIndex]);
                    }}
                    sx={{ bgcolor: '#fff', border: '1px solid #ddd' }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                )}

                <Box
                  component="img"
                  src={imageViewerUrl}
                  alt={imageViewerTitle || 'Appointment image'}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: 2,
                    bgcolor: '#fff',
                  }}
                />

                {imageViewerPhotos.length > 1 && (
                  <IconButton
                    onClick={() => {
                      const nextIndex =
                        imageViewerIndex === imageViewerPhotos.length - 1
                          ? 0
                          : imageViewerIndex + 1;

                      setImageViewerIndex(nextIndex);
                      setImageViewerUrl(imageViewerPhotos[nextIndex]);
                    }}
                    sx={{ bgcolor: '#fff', border: '1px solid #ddd' }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                )}
              </Box>

              {imageViewerPhotos.length > 1 && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    justifyContent: 'center',
                    mt: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  {imageViewerPhotos.map((photoUrl, index) => (
                    <Box
                      key={`${photoUrl}-${index}`}
                      component="img"
                      src={photoUrl}
                      alt={`Thumbnail ${index + 1}`}
                      onClick={() => {
                        setImageViewerIndex(index);
                        setImageViewerUrl(photoUrl);
                      }}
                      sx={{
                        width: 72,
                        height: 72,
                        objectFit: 'cover',
                        borderRadius: 1,
                        cursor: 'pointer',
                        border:
                          imageViewerIndex === index
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

      {/* WARNING MODAL */}
      <Dialog
        open={warningOpen}
        onClose={() => setWarningOpen(false)}
        fullWidth
        maxWidth="xs"
        sx={{ zIndex: 99999 }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontWeight: 800,
            color: '#92400E',
          }}
        >
          <WarningAmberIcon sx={{ color: '#f4b400' }} />
          Warning
        </DialogTitle>

        <DialogContent>
          <Typography sx={{ color: '#333' }}>{warningMessage}</Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setWarningOpen(false)}
            sx={{
              backgroundColor: '#000',
              color: '#f4b400',
              px: 4,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { backgroundColor: '#111' },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* SUCCESS MODAL */}
      <Dialog open={successOpen} onClose={() => setSuccessOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Success</DialogTitle>
        <DialogContent>
          <Typography>{successMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessOpen(false)}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* Settings Modal */}
    <Dialog
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 0,
            bgcolor: "#f3f3f3",
            p: 2,
          },
        },
      }}
    >
      <Box sx={{ p: 3, position: "relative" }}>
        <IconButton
          onClick={() => setSettingsOpen(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <Typography sx={{ fontSize: 26, fontWeight: 900, mb: 3 }}>
          Appointment Settings
        </Typography>

        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
          Booking Cutoff (Hours) <Box component="span" sx={{ color: "red" }}>*</Box>
        </Typography>

        <TextField
          select
          fullWidth
          value={bookingCutoffHours}
          onChange={(e) => setBookingCutoffHours(Number(e.target.value))}
          sx={{ mb: 5, bgcolor: "#fff" }}
        >
          <MenuItem value={1}>1 Hour</MenuItem>
          <MenuItem value={2}>2 Hours</MenuItem>
          <MenuItem value={3}>3 Hours</MenuItem>
          <MenuItem value={4}>4 Hours</MenuItem>
          <MenuItem value={5}>5 Hours</MenuItem>
          <MenuItem value={6}>6 Hours</MenuItem>
          <MenuItem value={7}>7 Hours</MenuItem>
          <MenuItem value={8}>8 Hours</MenuItem>
          <MenuItem value={9}>9 Hours</MenuItem>
          <MenuItem value={10}>10 Hours</MenuItem>
          <MenuItem value={11}>11 Hours</MenuItem>
          <MenuItem value={12}>12 Hours</MenuItem>
          <MenuItem value={24}>24 Hours</MenuItem>
        </TextField>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            onClick={saveSettings}
            sx={{
              bgcolor: "#000",
              color: "#ffc400",
              width: 160,
              py: 1.5,
              textTransform: "none",
              "&:hover": { bgcolor: "#111" },
            }}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Dialog>
    </Box>
  );
}
