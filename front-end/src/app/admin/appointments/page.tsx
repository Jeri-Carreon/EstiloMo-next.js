'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
}

interface CustomerOption {
  id: string;
  customerCode: string;
  name: string;
}

interface BarberOption {
  id: string;
  name: string;
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

const readOnlyStatuses = ['COMPLETED', 'NOSHOW', 'CANCELLED'];

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function AppointmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [pendingPage, setPendingPage] = useState(1);
  const [processedPage, setProcessedPage] = useState(1);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openEditScheduleModal, setOpenEditScheduleModal] = useState(false);

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

  const [addCurrentMonth, setAddCurrentMonth] = useState(new Date());
  const [selectedAddDate, setSelectedAddDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<AvailableTime | null>(null);
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(
    new Set()
  );

  const itemsPerPage = 4;
  const servicePrice = Number(selectedAddService?.price || 0);

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

  const loadAppointments = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/admin/appointments', {
        cache: 'no-store',
      });

      if (res.status === 403) {
        router.push('/unauthorized');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to load appointments.');
        setAppointments([]);
        return;
      }

      setAppointments(
        (data || []).map((appointment: any) => ({
          id: appointment.id,
          appointmentCode: appointment.appointmentCode,
          customerId: appointment.customerId,
          customerCode: appointment.customer?.customerCode || '',
          customerName:
            appointment.customer?.name ||
            [appointment.customer?.firstName, appointment.customer?.lastName]
              .filter(Boolean)
              .join(' ') ||
            '',
          schedule: appointment.schedule?.formatted || '',
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
          afterServicePhotoUrl: appointment.afterServicePhotoUrl || null,
        }))
      );

      setError('');
    } catch {
      setError('Unable to load appointments.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [customersRes, barbersRes] = await Promise.all([
        fetch('/api/customers', { cache: 'no-store' }),
        fetch('/api/appointment/barbers', { cache: 'no-store' }),
      ]);

      const customersData = await customersRes.json();
      const barbersData = await barbersRes.json();

      setCustomers(
        (customersData.customers || customersData || []).map((c: any) => ({
          id: c.id,
          customerCode: c.customerCode || '',
          name:
            c.name ||
            [c.firstName, c.lastName].filter(Boolean).join(' ') ||
            c.email ||
            'Unknown Customer',
        }))
      );

      setBarbers(
        (barbersData.barbers || barbersData || []).map((b: any) => ({
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
    if (!addForm.barberId) {
      setUnavailableDates(new Set());
      return;
    }

    try {
      const year = month.getFullYear();
      const m = String(month.getMonth() + 1).padStart(2, '0');

      const response = await fetch(
        `/api/admin/barbers/unavailable-dates?barberId=${addForm.barberId}&year=${year}&month=${m}`
      );

      const data = await response.json();

      setUnavailableDates(new Set(data?.unavailableDates ?? []));
    } catch (error) {
      console.error(error);
      setUnavailableDates(new Set());
    }
  };

  useEffect(() => {
    if (status === 'loading') return;

    const role = (session?.user as { role?: string })?.role;

    if (!session?.user?.email || !['OWNER', 'RECEPTIONIST'].includes(role || '')) {
      router.push('/unauthorized');
      return;
    }

    loadAppointments();
    loadOptions();
  }, [session, status, router]);

  useEffect(() => {
    fetchUnavailableDates(addCurrentMonth);
  }, [addCurrentMonth, addForm.barberId]);

  useEffect(() => {
    if (!selectedAddDate) return;

    fetchAvailability(selectedAddDate);
  }, [selectedAddDate, addForm.barberId, addForm.serviceId]);

  const formatAmount = (amount: number | string | null) => {
    if (amount === null || amount === undefined) return '-';

    const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (Number.isNaN(parsed)) return '-';

    return `₱ ${parsed.toFixed(2)}`;
  };

  const isReadOnly =
    selectedAppointment &&
    readOnlyStatuses.includes(selectedAppointment.status.toUpperCase());

  const filteredPendingAppointments = appointments.filter(
    (appointment) => appointment.status === 'PENDING'
  );

  const filteredProcessedAppointments = appointments.filter(
    (appointment) => appointment.status !== 'PENDING'
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
      alert('Please complete all required fields.');
      return;
    }

    try {
      setSaving(true);

      const res = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: addForm.customerId,
          barberId: addForm.barberId,
          serviceId: addForm.serviceId,
          appointmentDate: addForm.appointmentDate,
          startMinutes: Number(addForm.startMinutes),
          endMinutes: Number(addForm.endMinutes),
          status: 'SCHEDULED',
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        alert(data.error || 'Failed to add appointment.');
        return;
      }

      resetAddModal();
      setSuccessMessage('Appointment successfully added!');
      setSuccessOpen(true);
      await loadAppointments();
    } catch (error) {
      console.error('ADD APPOINTMENT ERROR:', error);
      alert('Failed to add appointment.');
    } finally {
      setSaving(false);
    }
  };

  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
        alert(data.error || 'Failed to update appointment.');
        return;
      }

      setOpenEditModal(false);
      setSelectedAppointment(null);
      setSuccessMessage('Appointment successfully updated!');
      setSuccessOpen(true);
      await loadAppointments();
    } catch (error) {
      console.error('UPDATE APPOINTMENT ERROR:', error);
      alert('Failed to update appointment.');
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
          {rows.map((appointment) => (
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
              <TableCell sx={{ fontWeight: 700 }}>
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
  );

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
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Pending appointments
          </Typography>

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

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Processed appointments
          </Typography>

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
        </>
      )}

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
                  `${option.name} ${option.customerCode ? `(${option.customerCode})` : ''}`
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
                  const service = services.find((s) => s.id === serviceId) || null;

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
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
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
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
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
                            if (date && !isPastDate && !isUnavailable) {
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
                          setSelectedTime(time);

                          setAddForm((prev) => ({
                            ...prev,
                            startMinutes: String(time.startMinutes),
                            endMinutes: String(time.endMinutes),
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
                        {time.label}
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
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', p: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, color: '#999' }}>
                    Service Summary
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: '#999' }}>Price</Typography>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', p: 1.5 }}>
                  <Typography>{selectedAddService?.name || '-'}</Typography>
                  <Typography>₱ {servicePrice.toFixed(2)}</Typography>
                </Box>
              </Box>

              <Box sx={{ bgcolor: '#fff', p: 2 }}>
                {[
                  ['Subtotal', servicePrice],
                  ['Downpayment To Pay', 150],
                  ['Total', servicePrice],
                ].map(([label, amount]) => (
                  <Box
                    key={label}
                    sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                  >
                    <Typography sx={{ fontWeight: 900 }}>{label}</Typography>
                    <Typography>₱ {Number(amount).toFixed(2)}</Typography>
                  </Box>
                ))}
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
                Are you sure you want to add the following appointment:
              </Typography>

              <Typography sx={{ fontSize: 13, color: '#777' }}>
                Customer ID: {selectedAddCustomer?.customerCode || '—'}
              </Typography>

              <TextField value={selectedAddCustomer?.name || ''} disabled sx={{ bgcolor: '#fff' }} />

              <TextField
                value={barbers.find((b) => b.id === addForm.barberId)?.name || ''}
                disabled
                sx={{ bgcolor: '#fff' }}
              />

              <TextField
                value={`${addForm.appointmentDate} ${addForm.startMinutes} - ${addForm.endMinutes}`}
                disabled
                sx={{ bgcolor: '#fff' }}
              />

              <Box sx={{ bgcolor: '#fff', p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 700, color: '#999' }}>
                    Service Summary
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: '#999' }}>Price</Typography>
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
                  <Typography sx={{ fontWeight: 900 }}>Downpayment To Pay</Typography>
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
                  alert('Please complete all required fields.');
                  return;
                }

                setAddStep(2);
                return;
              }

              if (addStep === 2) {
                if (!addForm.appointmentDate || !addForm.startMinutes || !addForm.endMinutes) {
                  alert('Please complete the schedule.');
                  return;
                }

                setAddStep(3);
                return;
              }

              if (addStep === 3) {
                if (!addProof) {
                  alert('Please upload proof of downpayment.');
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
                  services.some((service) => service.id === selectedAppointment.serviceId)
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
                  onClick={() => setOpenEditScheduleModal(true)}
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
                      onClick={() =>
                        window.open(selectedAppointment.paymentScreenshotUrl!, '_blank')
                      }
                      sx={{
                        p: 0,
                        color: '#3b82f6',
                        textTransform: 'none',
                        fontSize: 13,
                      }}
                    >
                      Image_12345
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
                disabled={!!isReadOnly}
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
                <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="NOSHOW">No-show</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
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
                  {selectedAppointment.afterServicePhotoUrl ? (
                    <Button
                      onClick={() => setPhotoViewerOpen(true)}
                      sx={{
                        p: 0,
                        color: '#3b82f6',
                        textTransform: 'none',
                        fontSize: 13,
                      }}
                    >
                      Image_12345
                    </Button>
                  ) : (
                    <Typography sx={{ color: '#999', fontSize: 13 }}>
                      No after service photos
                    </Typography>
                  )}
                </Box>
              </Box>

              {isReadOnly && (
                <Typography sx={{ color: 'error.main', fontSize: 13 }}>
                  Completed, No-show, and Cancelled appointments are view-only.
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
                onClick={() => setOpenEditModal(false)}
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

                      if (selectedAppointment) {
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
                      }

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
                  setSelectedTime(time);

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
                          endMinutes: time.endMinutes,
                          schedule: `${selectedDateText} ${time.label}`,
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
                {time.label}
              </Button>
            );
          })}
        </Box>
      </Box>
    </Box>
  </DialogContent>
</Dialog>
    </Box>
  );
}