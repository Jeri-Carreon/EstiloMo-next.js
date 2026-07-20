"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toPHDateKey } from "@/lib/dateUtils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import OutlinedInput from "@mui/material/OutlinedInput";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import InfoIcon from "@mui/icons-material/Info";
import Pagination from "@mui/material/Pagination";

import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DialogActions from "@mui/material/DialogActions";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";

import TextField from "@mui/material/TextField";

type Barber = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  isActive?: boolean;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    isActive?: boolean | null;
  } | null;
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

type ServiceApiRow = {
  id: string;
  name: string;
  price?: number | string | null;
};

type AbsentApiRow = {
  barberId: string;
  date: string;
};

type AppointmentApiRow = {
  id: string;
  appointmentCode: string;
  customer?: {
    customerCode?: string | null;
    name?: string | null;
  } | null;
  appointmentDate?: string | null;
  schedule?: {
    startTime?: string | null;
    endTime?: string | null;
    formatted?: string | null;
  } | null;
  barberId?: string;
  barber?: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  serviceId?: string;
  service?: {
    name?: string | null;
  } | null;
  payment?: {
    amount?: number | string | null;
    screenshotUrl?: string | null;
  } | null;
  status?: string | null;
  afterServicePhotoUrl?: string | null;
  afterServicePhotos?: {
    id: string;
    imageUrl: string;
    createdAt?: string;
  }[];
};

type ApiErrorResponse = {
  error?: string;
  details?: string;
};

type UploadResponse = ApiErrorResponse & {
  url?: string;
};

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TIME_OPTIONS = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
  "08:00 PM",
];

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const adjustedHour = hours % 12 || 12;

  return `${String(adjustedHour).padStart(2, "0")}:${String(mins).padStart(
    2,
    "0",
  )} ${period}`;
}

function timeToMinutes(time: string) {
  const [timePart, modifier] = time.split(" ");
  const [rawHours, minutes] = timePart.split(":").map(Number);
  let hours = rawHours;

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

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

  return target.toLocaleDateString("en-CA");
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

function isBarberActive(barber: Barber) {
  return (barber.isActive ?? barber.user?.isActive) !== false;
}

function getBarberDisplayName(barber: Barber | undefined | null) {
  if (!barber) return "Unknown Barber";

  return (
    barber.name ||
    [barber.firstName, barber.lastName].filter(Boolean).join(" ") ||
    [barber.user?.firstName, barber.user?.lastName].filter(Boolean).join(" ") ||
    "Unknown Barber"
  );
}

export default function BarbersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const [openAvailability, setOpenAvailability] = useState(false);
  const [currentBarberIndex, setCurrentBarberIndex] = useState(0);
  const [showUnavailableBarbers, setShowUnavailableBarbers] = useState(false);

  const [availabilityDraft, setAvailabilityDraft] = useState<
    AvailabilityRow[] | null
  >(null);
  const [availabilityCalendarMonth, setAvailabilityCalendarMonth] = useState(
    new Date(),
  );
  const [absentDraftMap, setAbsentDraftMap] = useState<Record<string, boolean>>(
    {},
  );
  const [pendingAbsentChanges, setPendingAbsentChanges] = useState<
    Record<string, boolean>
  >({});

  // Session
  const [role, setRole] = useState<string>("");

  const [scheduledPage, setScheduledPage] = useState(1);
  const [processedPage, setProcessedPage] = useState(1);

  // Search & Filter
  const [processedSearch, setProcessedSearch] = useState("");
  const [processedStatusFilter, setProcessedStatusFilter] = useState("ALL");
  const itemsPerPage = 4;

  const { data: barbers = [], isLoading: barberLoading } = useQuery<Barber[]>({
    queryKey: ["adminBarbers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/barbers", {
        cache: "no-store",
      });

      if (res.status === 403) {
        router.push("/unauthorized");
        return [];
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to load barbers.");
      }

      return data.barbers || [];
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  const { data: absentMap = {} } = useQuery<Record<string, boolean>>({
    queryKey: ["adminBarberAbsents"],
    queryFn: async () => {
      const res = await fetch("/api/admin/barbers/absent", {
        cache: "no-store",
      });

      const data = (await res.json()) as AbsentApiRow[] | ApiErrorResponse;

      if (!res.ok) {
        throw new Error(
          !Array.isArray(data) && data.error
            ? data.error
            : "Unable to load barber absences.",
        );
      }

      const map: Record<string, boolean> = {};

      if (Array.isArray(data)) {
        data.forEach((item) => {
          map[`${item.barberId}-${item.date}`] = true;
        });
      }

      return map;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  const displayedBarbers = useMemo(() => {
    return showUnavailableBarbers
      ? barbers
      : barbers.filter(isBarberActive);
  }, [barbers, showUnavailableBarbers]);

  const currentBarber = displayedBarbers[currentBarberIndex];
  const defaultAvailability = useMemo(() => {
    if (!currentBarber) return [];

    return DAYS.map((day, index) => {
      const schedule = currentBarber.schedules.find(
        (s) => s.dayOfWeek === index,
      );

      return {
        day,
        dayOfWeek: index,
        enabled: schedule ? !schedule.isDayOff : false,
        from: schedule ? minutesToTime(schedule.startTime) : "10:00 AM",
        to: schedule ? minutesToTime(schedule.endTime) : "08:00 PM",
      };
    });
  }, [currentBarber]);
  const availability = availabilityDraft || defaultAvailability;
  const currentBarberId = currentBarber?.id || "";

  const {
    data: appointments = [],
    isLoading: appointmentLoading,
    error: appointmentsQueryError,
  } = useQuery<Appointment[]>({
    queryKey: ["adminBarberAppointments", currentBarberId],
    enabled: !!currentBarberId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/barbers/${currentBarberId}`, {
        cache: "no-store",
      });

      if (res.status === 403) {
        router.push("/unauthorized");
        return [];
      }

      const data = (await res.json()) as AppointmentApiRow[] | ApiErrorResponse;

      if (!res.ok) {
        throw new Error(
          !Array.isArray(data) && data.error
            ? data.error
            : "Unable to load appointments.",
        );
      }

      const appointmentRows = Array.isArray(data) ? data : [];

      return appointmentRows.map((appointment) => ({
        id: appointment.id,
        appointmentCode: appointment.appointmentCode,
        customerCode: appointment.customer?.customerCode || "",
        customerName: appointment.customer?.name || "",
        appointmentDate: appointment.appointmentDate || "",
        startMinutes: appointment.schedule?.startTime
          ? timeToMinutes(appointment.schedule.startTime)
          : undefined,
        endMinutes: appointment.schedule?.endTime
          ? timeToMinutes(appointment.schedule.endTime)
          : undefined,
        schedule: appointment.schedule?.formatted || "",
        barberId: appointment.barberId,
        barberName:
          appointment.barber?.name ||
          [appointment.barber?.firstName, appointment.barber?.lastName]
            .filter(Boolean)
            .join(" ") ||
          "",
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
      }));
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  const error = appointmentsQueryError instanceof Error ? appointmentsQueryError.message : "";

  const [openEditModal, setOpenEditModal] = useState(false);
  const [openEditDayModal, setOpenEditDayModal] = useState(false);

  // Calendar View
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [openCalendarModal, setOpenCalendarModal] = useState(false);

  // Day View
  const [dayViewDate, setDayViewDate] = useState(new Date());
  const [openDayViewModal, setOpenDayViewModal] = useState(false);

  // Edit Appointment
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState("");
  const [imageViewerTitle, setImageViewerTitle] = useState("");
  const [imageViewerPhotos, setImageViewerPhotos] = useState<
    { id: string; imageUrl: string; createdAt?: string }[]
  >([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const [photoSuccessOpen, setPhotoSuccessOpen] = useState(false);
  const [photoSuccessMessage, setPhotoSuccessMessage] = useState("");
  const [pendingAfterServicePhotoUrls, setPendingAfterServicePhotoUrls] =
    useState<string[]>([]);

  const barberOption = useMemo(
    () =>
      barbers
        .filter(isBarberActive)
        .map((b) => ({
          id: b.id,
          name: getBarberDisplayName(b),
        })),
    [barbers],
  );

  const canUploadAfterServicePhoto =
    selectedAppointment?.status?.toUpperCase() === "COMPLETED";

  const openImageViewer = (
    title: string,
    photos: { id: string; imageUrl: string; createdAt?: string }[],
    index = 0,
  ) => {
    const validPhotos = photos.filter((photo) => !!photo.imageUrl);

    setImageViewerTitle(title);
    setImageViewerPhotos(validPhotos);
    setImageViewerIndex(index);

    const selectedPhoto = validPhotos[index] || validPhotos[0];

    setImageViewerUrl(selectedPhoto?.imageUrl || "");
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
            id: "legacy-after-service-photo",
            imageUrl: appointment.afterServicePhotoUrl,
          },
        ]
      : [];
  };

  const loadServicesByBarber = useCallback(async (barberId: string) => {
    try {
      const res = await fetch(
        `/api/appointment/services?barberId=${barberId}`,
        {
          cache: "no-store",
        },
      );
      const data = (await res.json()) as
        { services?: ServiceApiRow[] } | ServiceApiRow[];
      const serviceRows = Array.isArray(data) ? data : data.services || [];

      setServices(
        serviceRows.map((s) => ({
          id: s.id,
          name: s.name,
          price: Number(s.price || 0),
        })),
      );
    } catch (error) {
      console.error("LOAD SERVICES ERROR:", error);
      setServices([]);
    }
  }, []);

  const handleUpdateAppointment = async () => {
    console.log("SAVE CLICKED");
    console.log("SELECTED APPOINTMENT:", selectedAppointment);
    console.log("CAN UPLOAD:", canUploadAfterServicePhoto);
    console.log("PENDING PHOTO URLS TO SAVE:", pendingAfterServicePhotoUrls);

    if (!selectedAppointment || !canUploadAfterServicePhoto) {
      alert("This appointment is not allowed to upload after-service photos.");
      return;
    }

    if (pendingAfterServicePhotoUrls.length === 0) {
      alert("Please upload an after-service photo first.");
      return;
    }

    try {
      setSaving(true);

      const uniquePhotoUrls = Array.from(new Set(pendingAfterServicePhotoUrls));

      for (const photoUrl of uniquePhotoUrls) {
        const payload = {
          afterServicePhotoUrl: photoUrl,
        };

        console.log(
          "PUT URL:",
          `/api/admin/appointments/${selectedAppointment.id}`,
        );
        console.log("PUT PAYLOAD:", payload);

        const res = await fetch(
          `/api/admin/appointments/${selectedAppointment.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        const text = await res.text();
        console.log("PUT STATUS:", res.status);
        console.log("PUT RAW RESPONSE:", text);

        let data: ApiErrorResponse = {};
        try {
          data = text ? (JSON.parse(text) as ApiErrorResponse) : {};
        } catch (parseError) {
          console.error("PUT JSON PARSE ERROR:", parseError);
        }

        console.log("PUT PARSED RESPONSE:", data);

        if (!res.ok) {
          alert(
            data.error || data.details || "Failed to save after-service photo.",
          );
          return;
        }
      }

      setPendingAfterServicePhotoUrls([]);
      setPhotoSuccessMessage(
        uniquePhotoUrls.length > 1
          ? "After-service photos uploaded successfully!"
          : "After-service photo uploaded successfully!",
      );
      setPhotoSuccessOpen(true);

      setOpenEditModal(false);
      setOpenEditDayModal(false);
      setSelectedAppointment(null);

      if (currentBarber?.id) {
        queryClient.invalidateQueries({
          queryKey: ["adminBarberAppointments", currentBarber.id],
        });
      }
    } catch (error) {
      console.error("SAVE AFTER SERVICE PHOTO ERROR:", error);
      alert("Failed to save after-service photo.");
    } finally {
      setSaving(false);
    }
  };

  async function saveAvailability() {
    await fetch(`/api/admin/barbers/${currentBarber.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schedules: availability.map((item) => ({
          dayOfWeek: item.dayOfWeek,
          startTime: timeToMinutes(item.from),
          endTime: timeToMinutes(item.to),
          isDayOff: !item.enabled,
        })),
      }),
    });

    for (const [key, checked] of Object.entries(pendingAbsentChanges)) {
      const date = key.replace(`${currentBarber.id}-`, "");

      await fetch("/api/admin/barbers/absent", {
        method: checked ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: currentBarber.id,
          date,
        }),
      });
    }

    setPendingAbsentChanges({});
    setOpenAvailability(false);
    setAvailabilityDraft(null);

    queryClient.invalidateQueries({ queryKey: ["adminBarbers"] });
    queryClient.invalidateQueries({ queryKey: ["adminBarberAbsents"] });
    queryClient.invalidateQueries({
      queryKey: ["adminBarberAppointments", currentBarber.id],
    });
  }

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/user/role");
        const data = await res.json();
        setRole(data.role);

        if (!data.accessibleTabs?.includes("barbers")) {
          router.push("/unauthorized");
          return;
        }
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, [router, supabase]);


  useEffect(() => {
    if (
      displayedBarbers.length > 0 &&
      currentBarberIndex > displayedBarbers.length - 1
    ) {
      setCurrentBarberIndex(0);
    }
  }, [displayedBarbers.length, currentBarberIndex]);

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

  const getStatusColor = (status: string) => {
    const value = status.toUpperCase();

    if (value === "COMPLETED") return "green";
    if (value === "CANCELLED") return "red";
    if (value === "SCHEDULED") return "#2563eb";
    if (value === "NOSHOW") return "#1F2937";

    return "#333";
  };

  const openAppointmentDetails = useCallback(
    async (appointment: Appointment) => {
      setServices([]);

      if (appointment.barberId) {
        await loadServicesByBarber(appointment.barberId);
      }

      setPendingAfterServicePhotoUrls([]);
      setSelectedAppointment(appointment);
      setOpenEditModal(true);
    },
    [loadServicesByBarber],
  );

  {
    /* Scheduled Appointments */
  }
  const filteredScheduledAppointments = appointments
    .filter((appointment) => appointment.status === "SCHEDULED")
    .sort(compareNewestScheduleFirst);

  const paginatedScheduledAppointments = filteredScheduledAppointments.slice(
    (scheduledPage - 1) * itemsPerPage,
    scheduledPage * itemsPerPage,
  );

  const totalPagesScheduled = Math.ceil(
    filteredScheduledAppointments.length / itemsPerPage,
  );

  {
    /* Processed Appointments */
  }
  const processedBaseAppointments = appointments
    .filter(
      (appointment) =>
        appointment.status.toUpperCase() !== "SCHEDULED" &&
        appointment.status.toUpperCase() !== "PENDING" &&
        appointment.status.toUpperCase() !== "REJECTED",
    )
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
        processedStatusFilter === "ALL" ||
        appointment.status.toUpperCase() === processedStatusFilter;

      const isProcessed =
        appointment.status !== "SCHEDULED" &&
        appointment.status !== "PENDING" &&
        appointment.status !== "REJECTED";
      return matchesSearch && matchesStatus && isProcessed;
    },
  );

  const paginatedProcessedAppointments = filteredProcessedAppointments.slice(
    (processedPage - 1) * itemsPerPage,
    processedPage * itemsPerPage,
  );

  const totalPagesProcessed = Math.ceil(
    filteredProcessedAppointments.length / itemsPerPage,
  );

  if (barberLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  // CALENDAR VIEW
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function formatMinutes(minutes: number) {
    if (minutes === undefined || minutes === null) return "";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  }

  const renderAppointmentCalendar = () => {
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

    const monthAppointments = appointments
      .filter((appointment) => {
        const date = appointment.appointmentDate
          ? new Date(appointment.appointmentDate)
          : null;

        return (
          date &&
          date.getFullYear() === year &&
          date.getMonth() === month &&
          appointment.status !== "PENDING" &&
          appointment.status !== "REJECTED"
        );
      })
      .sort(compareNewestScheduleFirst);

    const getAppointmentsForDay = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return appointments.filter(
        (a) =>
          toPHDateKey(a.appointmentDate) === dateStr &&
          a.status !== "PENDING" &&
          a.status !== "REJECTED",
      );
    };

    const statusColor: Record<string, { bg: string; color: string }> = {
      SCHEDULED: { bg: "#DBEAFE", color: "#1E40AF" },
      COMPLETED: { bg: "#D1FAE5", color: "#065f46" },
      CANCELLED: { bg: "#d81d1d", color: "#2b1515" },
      NOSHOW: { bg: "#E5E7EB", color: "#1F2937" },
    };

    return (
      <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "space-between", sm: "flex-end" },
            gap: 1,
            mb: 2,
          }}
        >
          <IconButton
            size="small"
            onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
            sx={{ border: "1px solid #d0d0d0", bgcolor: "#fff" }}
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>

          <Typography
            sx={{
              fontWeight: 700,
              fontSize: { xs: "0.95rem", sm: "1.1rem" },
              minWidth: 0,
              flex: 1,
              textAlign: "center",
            }}
          >
            {currentMonth.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </Typography>

          <IconButton
            size="small"
            onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
            sx={{ border: "1px solid #d0d0d0", bgcolor: "#fff" }}
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box
          sx={{
            border: "1px solid #d0d0d0",
            borderRadius: 1,
            overflow: "hidden",
            bgcolor: "#fff",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            }}
          >
            {weekdays.map((day) => (
              <Box
                key={day}
                sx={{
                  textAlign: "center",
                  py: { xs: 0.9, sm: 1.2 },
                  fontSize: { xs: 11, sm: 12 },
                  fontWeight: 700,
                  borderRight: "1px solid #e0e0e0",
                  borderBottom: "1px solid #d0d0d0",
                  "&:last-child": { borderRight: "none" },
                }}
              >
                {day}
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            }}
          >
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
                    minHeight: { xs: 48, sm: 90 },
                    borderRight: "1px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                    p: { xs: 0.35, sm: 0.5 },
                    bgcolor: isToday ? "#8d8d8d" : day ? "#fafafa" : "#f0f0f0",
                    "&:nth-of-type(7n)": { borderRight: "none" },
                  }}
                >
                  {day && (
                    <>
                      <Typography
                        sx={{
                          fontSize: { xs: 10, sm: 11 },
                          color: "#999",
                          textAlign: "right",
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
                            onClick={() => openAppointmentDetails(appointment)}
                            sx={{
                              display: { xs: "none", sm: "block" },
                              fontSize: 10,
                              fontWeight: 600,
                              px: 0.8,
                              py: 0.3,
                              mb: 0.3,
                              borderRadius: 1,
                              bgcolor: colors.bg,
                              color: colors.color,
                              cursor: "pointer",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              "&:hover": { filter: "brightness(0.92)" },
                            }}
                          >
                            {appointment.startMinutes != null &&
                              appointment.endMinutes != null && (
                                <>
                                  {" "}
                                  {formatMinutes(
                                    appointment.startMinutes,
                                  )} -{" "}
                                  {formatMinutes(appointment.endMinutes)}{" "}
                                </>
                              )}
                          </Box>
                        );
                      })}

                      {dayAppointments.length > 0 && (
                        <Box
                          sx={{
                            display: { xs: "flex", sm: "none" },
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 18,
                            mx: "auto",
                            mt: 0.25,
                            px: 0.5,
                            borderRadius: 5,
                            bgcolor: "#111",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 800,
                            lineHeight: 1,
                          }}
                        >
                          {dayAppointments.length}
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box
          sx={{
            display: { xs: "flex", sm: "none" },
            flexDirection: "column",
            gap: 1,
            mt: 1.5,
          }}
        >
          {monthAppointments.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                border: "1px solid #e5e5e5",
                borderRadius: 1,
                textAlign: "center",
              }}
            >
              <Typography sx={{ color: "#777", fontSize: 13, fontWeight: 800 }}>
                No appointments this month.
              </Typography>
            </Paper>
          ) : (
            monthAppointments.map((appointment) => {
              const colors =
                statusColor[appointment.status.toUpperCase()] ||
                statusColor.NOSHOW;

              return (
                <Box
                  key={appointment.id}
                  onClick={() => openAppointmentDetails(appointment)}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "44px minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: 1,
                    p: 1,
                    border: "1px solid #e5e5e5",
                    borderRadius: 1,
                    bgcolor: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <Box
                    sx={{
                      textAlign: "center",
                      bgcolor: "#f5f5f5",
                      borderRadius: 1,
                      py: 0.5,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: 10, fontWeight: 800, color: "#777" }}
                    >
                      {new Date(
                        appointment.appointmentDate || "",
                      ).toLocaleString("en-US", {
                        month: "short",
                      })}
                    </Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 900 }}>
                      {new Date(appointment.appointmentDate || "").getDate()}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 900,
                        lineHeight: 1.2,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {appointment.customerName || appointment.serviceName}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#777",
                        fontSize: 11,
                        fontWeight: 700,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {appointment.startMinutes != null
                        ? formatMinutes(appointment.startMinutes)
                        : "No time"}{" "}
                      - {appointment.serviceName}
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      color: colors.color,
                      bgcolor: colors.bg,
                      border: `1px solid ${colors.color}`,
                      borderRadius: 5,
                      px: 0.8,
                      py: 0.3,
                      fontSize: 10,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {appointment.status}
                  </Typography>
                </Box>
              );
            })
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
          {Object.entries(statusColor).map(([label, colors]) => (
            <Box
              key={label}
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "2px",
                  bgcolor: colors.bg,
                  border: `1px solid ${colors.color}`,
                }}
              />
              <Typography sx={{ fontSize: 11, color: "#777" }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  if (!currentBarber) {
    return (
      <Box sx={{ flex: 1, p: { xs: 2, sm: 3, md: 4 }, backgroundColor: "#fff" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1,
            mb: 2,
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: 30, sm: 38, md: 48 } }}>
            {role === "BARBER" ? "My Appointments" : "Barber's Management"}
          </Typography>

          {role !== "BARBER" && (
            <Button
              variant={showUnavailableBarbers ? "contained" : "outlined"}
              onClick={() => {
                setShowUnavailableBarbers((prev) => !prev);
                setCurrentBarberIndex(0);
              }}
              sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2 }}
            >
              {showUnavailableBarbers
                ? "Hide Unavailable Barbers"
                : "Show Unavailable Barbers"}
            </Button>
          )}
        </Box>

        <Typography sx={{ color: "text.secondary", fontWeight: 700 }}>
          {showUnavailableBarbers
            ? "No barbers found."
            : "No available barbers found. Click Show Unavailable Barbers to view inactive barbers."}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        p: { xs: 2, sm: 3, md: 4 },
        backgroundColor: "#fff",
        overflowX: "hidden",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1,
          mb: { xs: 2.5, md: 4 },
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            fontSize: { xs: 30, sm: 38, md: 48 },
            lineHeight: 1.1,
            overflowWrap: "anywhere",
          }}
        >
          {role === "BARBER" ? "My Appointments" : "Barber's Management"}
        </Typography>

        {role !== "BARBER" && (
          <Button
            variant={showUnavailableBarbers ? "contained" : "outlined"}
            onClick={() => {
              setShowUnavailableBarbers((prev) => !prev);
              setCurrentBarberIndex(0);
            }}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: 2,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            {showUnavailableBarbers
              ? "Hide Unavailable Barbers"
              : "Show Unavailable Barbers"}
          </Button>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 2,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontSize: { xs: 20, sm: 24 },
            overflowWrap: "anywhere",
          }}
        >
          {getBarberDisplayName(currentBarber)}
        </Typography>
      </Box>

      {role !== "BARBER" && (
        <Button
          variant="contained"
          onClick={() => {
            setAvailabilityDraft(defaultAvailability);
            setAbsentDraftMap(absentMap);
            setPendingAbsentChanges({});
            setAvailabilityCalendarMonth(new Date());
            setOpenAvailability(true);
          }}
          sx={{ width: "fit-content", backgroundColor: "#000", mb: 2 }}
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
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, fontSize: { xs: 20, sm: 24 } }}
        >
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
          <TableContainer
            component={Paper}
            sx={{
              display: role === "BARBER" ? "none" : { xs: "none", md: "block" },
            }}
          >
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
                      "&:hover": {
                        backgroundColor: "#fafafa",
                      },
                    }}
                  >
                    <TableCell>{appointment.appointmentCode}</TableCell>
                    <TableCell>{appointment.customerCode}</TableCell>
                    <TableCell>{appointment.customerName}</TableCell>
                    <TableCell>{appointment.schedule}</TableCell>
                    <TableCell>{appointment.serviceName}</TableCell>
                    <TableCell>{appointment.barberName}</TableCell>
                    <TableCell>
                      {formatAmount(appointment.totalAmount)}
                    </TableCell>
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
                        aria-label="view appointment"
                        onClick={() => openAppointmentDetails(appointment)}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              display: role === "BARBER" ? "flex" : { xs: "flex", md: "none" },
              flexDirection: "column",
              gap: 1.5,
              width: "100%",
              minWidth: 0,
            }}
          >
            {paginatedScheduledAppointments.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  border: "1px solid #e5e5e5",
                  borderRadius: 1,
                  textAlign: "center",
                }}
              >
                <Typography sx={{ color: "text.secondary", fontWeight: 700 }}>
                  No scheduled appointments.
                </Typography>
              </Paper>
            ) : (
              paginatedScheduledAppointments.map((appointment) => (
                <AppointmentMobileCard
                  key={appointment.id}
                  appointment={appointment}
                  amount={formatAmount(appointment.totalAmount)}
                  statusColor={getStatusColor(appointment.status)}
                  onOpen={() => openAppointmentDetails(appointment)}
                />
              ))
            )}
          </Box>

          {/* PAGINATION CONTROLS * */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: 1.5,
              mt: { xs: 2, sm: 4 },
            }}
          >
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 14,
                textAlign: { xs: "center", sm: "left" },
              }}
            >
              Showing 1 to {paginatedScheduledAppointments.length} of{" "}
              {filteredScheduledAppointments.length} Entries
            </Typography>

            <Pagination
              count={totalPagesScheduled}
              page={scheduledPage}
              onChange={(_, value) => setScheduledPage(value)}
              size="small"
              siblingCount={0}
              boundaryCount={1}
              sx={{
                display: "flex",
                justifyContent: "center",
                maxWidth: "100%",
                "& .MuiPagination-ul": {
                  justifyContent: "center",
                  flexWrap: "wrap",
                },
              }}
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
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, fontSize: { xs: 20, sm: 24 } }}
        >
          Processed appointments
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: { xs: 2.5, sm: 4 },
          flexWrap: "wrap",
        }}
      >
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
                  <SearchIcon sx={{ color: "#999" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            flex: { xs: "1 1 100%", sm: 1 },
            maxWidth: { xs: "100%", sm: 300 },
            minWidth: 0,
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
            width: { xs: "100%", sm: 170 },
            bgcolor: "#fff",
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
          <TableContainer
            component={Paper}
            sx={{
              display: role === "BARBER" ? "none" : { xs: "none", md: "block" },
            }}
          >
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
                      "&:hover": {
                        backgroundColor: "#fafafa",
                      },
                    }}
                  >
                    <TableCell>{appointment.appointmentCode}</TableCell>
                    <TableCell>{appointment.customerCode}</TableCell>
                    <TableCell>{appointment.customerName}</TableCell>
                    <TableCell>{appointment.schedule}</TableCell>
                    <TableCell>{appointment.serviceName}</TableCell>
                    <TableCell>{appointment.barberName}</TableCell>
                    <TableCell>
                      {formatAmount(appointment.totalAmount)}
                    </TableCell>
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
                        aria-label="view appointment"
                        onClick={() => openAppointmentDetails(appointment)}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              display: role === "BARBER" ? "flex" : { xs: "flex", md: "none" },
              flexDirection: "column",
              gap: 1.5,
              width: "100%",
              minWidth: 0,
            }}
          >
            {paginatedProcessedAppointments.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  border: "1px solid #e5e5e5",
                  borderRadius: 1,
                  textAlign: "center",
                }}
              >
                <Typography sx={{ color: "text.secondary", fontWeight: 700 }}>
                  No processed appointments.
                </Typography>
              </Paper>
            ) : (
              paginatedProcessedAppointments.map((appointment) => (
                <AppointmentMobileCard
                  key={appointment.id}
                  appointment={appointment}
                  amount={formatAmount(appointment.totalAmount)}
                  statusColor={getStatusColor(appointment.status)}
                  onOpen={() => openAppointmentDetails(appointment)}
                />
              ))
            )}
          </Box>

          {/* PAGINATION CONTROLS * */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: 1.5,
              mt: { xs: 2, sm: 4 },
            }}
          >
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 14,
                textAlign: { xs: "center", sm: "left" },
              }}
            >
              Showing 1 to {paginatedProcessedAppointments.length} of{" "}
              {filteredProcessedAppointments.length} Entries
            </Typography>

            <Pagination
              count={totalPagesProcessed}
              page={processedPage}
              onChange={(_, value) => setProcessedPage(value)}
              size="small"
              siblingCount={0}
              boundaryCount={1}
              sx={{
                display: "flex",
                justifyContent: "center",
                maxWidth: "100%",
                "& .MuiPagination-ul": {
                  justifyContent: "center",
                  flexWrap: "wrap",
                },
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: 1, sm: 0 },
              mt: 2,
            }}
          >
            <Button
              startIcon={<CalendarMonthIcon />}
              onClick={() => setOpenCalendarModal(true)}
              sx={{
                border: "1px solid #ccc",
                color: "#555",
                textTransform: "none",
                borderRadius: 2,
                px: 2,
                mr: { xs: 0, sm: 2 },
                width: { xs: "100%", sm: "auto" },
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
                border: "1px solid #ccc",
                color: "#555",
                textTransform: "none",
                borderRadius: 2,
                px: 2,
                width: { xs: "100%", sm: "auto" },
              }}
            >
              Day View
            </Button>
          </Box>
        </>
      )}
      {role !== "BARBER" && (
        <Box
          sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}
        >
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
            disabled={currentBarberIndex === displayedBarbers.length - 1}
            onClick={() => setCurrentBarberIndex((p) => p + 1)}
          >
            Next
          </Button>
        </Box>
      )}

      {/* Schedule Dialog Box */}
      <Dialog
        open={openAvailability}
        onClose={() => setOpenAvailability(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              width: { xs: "calc(100% - 32px)", sm: 640, md: 700, },
              maxWidth: "calc(100vw - 32px)",
              maxHeight: { xs: "calc(100% - 32px)", sm: "calc(100% - 64px)" },
              m: { xs: 2, sm: 3 },
              borderRadius: 3,
              overflow: "hidden",
            },
          },
        }}
      >
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            overflowY: "auto",
            maxHeight: { xs: "calc(100vh - 32px)", sm: "calc(100vh - 64px)" },
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              mb: 3,
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 24, sm: 28 },
                lineHeight: 1.15,
                fontWeight: 900,
                overflowWrap: "anywhere",
              }}
            >
              {getBarberDisplayName(currentBarber)}
            </Typography>

            <IconButton onClick={() => setOpenAvailability(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Typography sx={{ fontSize: 20, fontWeight: 900, mb: 3 }}>
            Working Days & Hours
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {availability.map((schedule, index) => (
              <Box
                key={schedule.day}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "36px 90px 110px 18px 110px",
                    sm: "40px 140px 150px 30px 150px",
                    md: "40px 150px 160px 30px 160px",
                  },
                  alignItems: "center",
                  columnGap: 2,
                  rowGap: 1,
                }}
              >
                <Checkbox
                  checked={schedule.enabled}
                  onChange={(e) => {
                    const updated = [...availability];
                    updated[index].enabled = e.target.checked;
                    setAvailabilityDraft(updated);
                  }}
                  sx={{
                    p: 0,
                    "& .MuiSvgIcon-root": { fontSize: 30 },
                    color: "#111",
                    "&.Mui-checked": { color: "#000" },
                  }}
                />

                <Typography
                  sx={{
                    width: { xs: 90, sm: 140, md: 150 },
                    fontWeight: 900,
                    color: schedule.enabled ? "#111" : "#888",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {schedule.day}
                </Typography>

                {schedule.enabled ? (
                  <>
                    <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
                      <Select
                        value={schedule.from}
                        onChange={(e) => {
                          const updated = [...availability];
                          updated[index].from = e.target.value;
                          setAvailabilityDraft(updated);
                        }}
                        input={<OutlinedInput />}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 800,
                          bgcolor: "#fff",
                          "& .MuiSelect-select": { py: 1.4 },
                        }}
                      >
                        {TIME_OPTIONS.map((t) => (
                          <MenuItem key={t} value={t}>
                            {t}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography
                      sx={{
                        display: { xs: "none", sm: "block" },
                        textAlign: "center",
                        color: "#555",
                      }}
                    >
                      to
                    </Typography>

                    <FormControl
                      size="small"
                      fullWidth
                      sx={{
                        gridColumn: { xs: "3 / 4", sm: "auto" },
                        minWidth: 0,
                      }}
                    >
                      <Select
                        value={schedule.to}
                        onChange={(e) => {
                          const updated = [...availability];
                          updated[index].to = e.target.value;
                          setAvailabilityDraft(updated);
                        }}
                        input={<OutlinedInput />}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 800,
                          bgcolor: "#fff",
                          "& .MuiSelect-select": { py: 1.4 },
                        }}
                      >
                        {TIME_OPTIONS.map((t) => (
                          <MenuItem key={t} value={t}>
                            {t}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                ) : (
                  <Typography
                    sx={{
                      gridColumn: { xs: "3 / 4", sm: "3 / 6" },
                      color: "#888",
                      fontWeight: 700,
                      textAlign: { xs: "right", sm: "left" },
                    }}
                  >
                    Closed (Day Off)
                  </Typography>
                )}
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 5 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 900 }}>
              Days Off (Calendar Blockout)
            </Typography>

            <Typography sx={{ color: "#888", fontSize: 14, mt: 0.5, mb: 2 }}>
              Select dates below to mark as blocked out.
            </Typography>

            {(() => {
              const year = availabilityCalendarMonth.getFullYear();
              const month = availabilityCalendarMonth.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const totalDays = new Date(year, month + 1, 0).getDate();

              const days: (number | null)[] = [
                ...Array(firstDay).fill(null),
                ...Array.from({ length: totalDays }, (_, i) => i + 1),
              ];

              return (
                <Box
                  sx={{
                    border: "1px solid #d6d6d6",
                    borderRadius: 2,
                    p: { xs: 2, sm: 3 },
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <IconButton
                      onClick={() =>
                        setAvailabilityCalendarMonth(
                          new Date(year, month - 1, 1),
                        )
                      }
                    >
                      <ChevronLeftIcon />
                    </IconButton>

                    <Typography
                      sx={{
                        fontSize: 20,
                        fontWeight: 900,
                        textAlign: "center",
                      }}
                    >
                      {availabilityCalendarMonth.toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      })}
                    </Typography>

                    <IconButton
                      onClick={() =>
                        setAvailabilityCalendarMonth(
                          new Date(year, month + 1, 1),
                        )
                      }
                    >
                      <ChevronRightIcon />
                    </IconButton>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      mb: 1,
                    }}
                  >
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <Typography
                        key={`${d}-${i}`}
                        sx={{ textAlign: "center", fontWeight: 700 }}
                      >
                        {d}
                      </Typography>
                    ))}
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      rowGap: 1,
                    }}
                  >
                    {days.map((day, index) => {
                      const dateKey = day
                        ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                        : "";

                      const absentKey = `${currentBarber.id}-${dateKey}`;
                      const selected = !!absentDraftMap[absentKey];

                      return (
                        <Box
                          key={index}
                          onClick={() => {
                            if (!day) return;

                            const nextValue = !selected;

                            setAbsentDraftMap((prev) => ({
                              ...prev,
                              [absentKey]: nextValue,
                            }));

                            setPendingAbsentChanges((prev) => ({
                              ...prev,
                              [absentKey]: nextValue,
                            }));
                          }}
                          sx={{
                            height: 38,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            fontWeight: selected ? 900 : 500,
                            cursor: day ? "pointer" : "default",
                            bgcolor: selected ? "#000" : "transparent",
                            color: selected ? "#fff" : "#111",
                            "&:hover": day
                              ? { bgcolor: selected ? "#000" : "#f1f1f1" }
                              : {},
                          }}
                        >
                          {day}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            })()}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
            <Button
              variant="contained"
              onClick={saveAvailability}
              sx={{
                bgcolor: "#000",
                color: "#fff",
                borderRadius: 999,
                px: 4,
                py: 1.3,
                fontWeight: 900,
                textTransform: "none",
                "&:hover": { bgcolor: "#111" },
              }}
            >
              Save Changes
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
              width: { xs: "calc(100% - 24px)", sm: "1100px" },
              maxWidth: "calc(100vw - 24px)",
              maxHeight: { xs: "calc(100% - 24px)", sm: "calc(100% - 64px)" },
              m: { xs: 1.5, sm: 3 },
            },
          },
        }}
      >
        <DialogTitle
          sx={{ fontWeight: 800, fontSize: { xs: 20, sm: 24 }, pr: 6 }}
        >
          Calendar View
          <IconButton
            onClick={() => setOpenCalendarModal(false)}
            sx={{ position: "absolute", right: 12, top: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            bgcolor: "#f5f5f5",
            pt: 2,
            px: { xs: 1, sm: 3 },
            pb: { xs: 1.5, sm: 3 },
            overflowX: "hidden",
          }}
        >
          {renderAppointmentCalendar()}
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
              width: { xs: "calc(100% - 24px)", sm: "650px" },
              maxWidth: "calc(100vw - 24px)",
              maxHeight: { xs: "calc(100% - 24px)", sm: "calc(100% - 64px)" },
              m: { xs: 1.5, sm: 3 },
              bgcolor: "#f2f2f2",
              borderRadius: 0,
            },
          },
        }}
      >
        <DialogTitle
          sx={{ fontWeight: 900, fontSize: { xs: 20, sm: 24 }, pb: 1, pr: 6 }}
        >
          Edit Appointment Details
          <IconButton
            onClick={() => {
              setOpenEditDayModal(false);
              setOpenDayViewModal(true);
            }}
            sx={{ position: "absolute", right: 12, top: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {selectedAppointment && (
          <>
            <DialogContent
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                pt: 1,
                px: { xs: 2, sm: 3 },
              }}
            >
              <Typography sx={{ fontSize: 12, color: "#555" }}>
                Customer ID: {selectedAppointment.customerCode}
              </Typography>

              <TextField
                label="Name *"
                value={selectedAppointment.customerName}
                disabled
                size="small"
                sx={{ bgcolor: "#fff" }}
              />

              <TextField
                select
                label="Barber *"
                value={selectedAppointment.barberId || ""}
                disabled
                size="small"
                sx={{ bgcolor: "#fff" }}
                onChange={(e) => {
                  const barberId = e.target.value;

                  setSelectedAppointment((prev) =>
                    prev
                      ? {
                          ...prev,
                          barberId,
                          serviceId: "",
                          appointmentDate: "",
                          startMinutes: undefined,
                          endMinutes: undefined,
                          schedule: "",
                        }
                      : prev,
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
                    (service) => service.id === selectedAppointment.serviceId,
                  )
                    ? selectedAppointment.serviceId
                    : ""
                }
                disabled
                size="small"
                sx={{ bgcolor: "#fff" }}
                onChange={(e) =>
                  setSelectedAppointment((prev) =>
                    prev
                      ? {
                          ...prev,
                          serviceId: e.target.value,
                          appointmentDate: "",
                          startMinutes: undefined,
                          endMinutes: undefined,
                          schedule: "",
                        }
                      : prev,
                  )
                }
              >
                {services.map((service) => (
                  <MenuItem key={service.id} value={service.id}>
                    {service.name}
                  </MenuItem>
                ))}
              </TextField>

              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  label="Schedule *"
                  value={selectedAppointment.schedule || "Select schedule"}
                  disabled
                  fullWidth
                  size="small"
                  sx={{
                    bgcolor: "#fff",
                    "& .MuiInputBase-input.Mui-disabled": {
                      WebkitTextFillColor: "#111",
                    },
                  }}
                />

                <IconButton
                  disabled
                  sx={{
                    bgcolor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: 1,
                    width: 42,
                    height: 40,
                    "&:hover": {
                      bgcolor: "#eee",
                    },
                  }}
                >
                  <CalendarMonthIcon />
                </IconButton>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 13, color: "#555", mb: 0.5 }}>
                  Proof of Downpayment <span style={{ color: "red" }}>*</span>
                </Typography>

                <Box
                  sx={{
                    bgcolor: "#fff",
                    minHeight: 38,
                    display: "flex",
                    alignItems: "center",
                    px: 1.5,
                  }}
                >
                  {selectedAppointment.paymentScreenshotUrl ? (
                    <Button
                      onClick={() => {
                        openImageViewer("Proof of Downpayment", [
                          {
                            id: "proof-of-downpayment",
                            imageUrl:
                              selectedAppointment.paymentScreenshotUrl || "",
                          },
                        ]);
                      }}
                      sx={{
                        p: 0,
                        color: "#3b82f6",
                        textTransform: "none",
                        fontSize: 13,
                      }}
                    >
                      View Image
                    </Button>
                  ) : (
                    <Typography sx={{ color: "#999", fontSize: 13 }}>
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
                sx={{ bgcolor: "#fff" }}
                onChange={(e) =>
                  setSelectedAppointment((prev) =>
                    prev ? { ...prev, status: e.target.value } : prev,
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
                <Typography sx={{ fontSize: 13, color: "#555", mb: 0.5 }}>
                  After Service Photos
                </Typography>

                <Box
                  sx={{
                    bgcolor: "#fff",
                    minHeight: 38,
                    display: "flex",
                    alignItems: "center",
                    px: 1.5,
                    gap: 1,
                  }}
                >
                  {getAfterServicePhotos(selectedAppointment).length > 0 ? (
                    getAfterServicePhotos(selectedAppointment).map(
                      (photo, index) => (
                        <Button
                          key={photo.id || photo.imageUrl}
                          onClick={() => {
                            openImageViewer(
                              "After Service Photos",
                              getAfterServicePhotos(selectedAppointment),
                              index,
                            );
                          }}
                          sx={{
                            p: 0,
                            color: "#3b82f6",
                            textTransform: "none",
                            fontSize: 13,
                          }}
                        >
                          View Image {index + 1}
                        </Button>
                      ),
                    )
                  ) : (
                    <Typography sx={{ color: "#999", fontSize: 13 }}>
                      No after service photos
                    </Typography>
                  )}
                </Box>
              </Box>
            </DialogContent>

            <DialogActions
              sx={{
                px: { xs: 2, sm: 3 },
                pb: { xs: 2, sm: 3 },
                justifyContent: "center",
                flexDirection: { xs: "column-reverse", sm: "row" },
                gap: 2,
              }}
            >
              <Button
                onClick={() => {
                  setOpenEditDayModal(false);
                  setOpenDayViewModal(true);
                }}
                sx={{
                  backgroundColor: "#777",
                  color: "#f4b400",
                  width: { xs: "100%", sm: 180 },
                  minHeight: 44,
                  py: 1,
                  borderRadius: 1,
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": {
                    backgroundColor: "#666",
                  },
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={handleUpdateAppointment}
                disabled={
                  !canUploadAfterServicePhoto ||
                  pendingAfterServicePhotoUrls.length === 0 ||
                  saving
                }
                sx={{
                  backgroundColor: "#000",
                  color: "#f4b400",
                  width: { xs: "100%", sm: 180 },
                  minHeight: 44,
                  py: 1,
                  borderRadius: 1,
                  textTransform: "none",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  "&:hover": {
                    backgroundColor: "#111",
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "#ccc",
                    color: "#777",
                  },
                }}
              >
                {saving
                  ? "Saving..."
                  : pendingAfterServicePhotoUrls.length > 1
                    ? "Save Photos"
                    : "Save Photo"}
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
              width: { xs: "calc(100% - 24px)", sm: "520px" },
              maxWidth: "calc(100vw - 24px)",
              maxHeight: { xs: "calc(100% - 24px)", sm: "calc(100% - 64px)" },
              m: { xs: 1.5, sm: 3 },
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            fontSize: { xs: 18, sm: 22 },
            lineHeight: 1.2,
            pb: 1,
            pr: { xs: 12, sm: 13 },
          }}
        >
          {dayViewDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              position: "absolute",
              right: 48,
              top: 12,
            }}
          >
            <IconButton
              size="small"
              onClick={() =>
                setDayViewDate((prev) => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() - 1);
                  return d;
                })
              }
              sx={{ border: "1px solid #d0d0d0", bgcolor: "#fff" }}
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
              sx={{ border: "1px solid #d0d0d0", bgcolor: "#fff" }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
          <IconButton
            onClick={() => setOpenDayViewModal(false)}
            sx={{ position: "absolute", right: 12, top: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, bgcolor: "#f2f2f2" }}>
          {(() => {
            const dateStr = toPHDateKey(dayViewDate);
            const dayAppointments = appointments.filter(
              (a) =>
                toPHDateKey(a.appointmentDate) === dateStr &&
                a.status !== "PENDING" &&
                a.status !== "REJECTED",
            );

            const hours = Array.from({ length: 11 }, (_, i) => i + 10);

            const statusColorMap: Record<
              string,
              { bg: string; color: string }
            > = {
              SCHEDULED: { bg: "#DBEAFE", color: "#1E40AF" },
              COMPLETED: { bg: "#D1FAE5", color: "#065f46" },
              CANCELLED: { bg: "#d81d1d", color: "#2b1515" },
              NOSHOW: { bg: "#E5E7EB", color: "#1F2937" },
            };

            return (
              <>
                <Box sx={{ position: "relative" }}>
                  {hours.map((hour) => {
                    const label =
                      hour === 12
                        ? "12 PM"
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
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "54px 1fr",
                            sm: "64px 1fr",
                          },
                          borderBottom: "1px solid #d5d5d5",
                        }}
                      >
                        <Box
                          sx={{
                            borderRight: "1px solid #d5d5d5",
                            py: 1.5,
                            px: 1,
                            fontSize: { xs: 11, sm: 12 },
                            fontWeight: 600,
                            color: "#555",
                            bgcolor: "#fff",
                            minHeight: 56,
                            display: "flex",
                            alignItems: "flex-start",
                            pt: 1.5,
                          }}
                        >
                          {label}
                        </Box>

                        <Box
                          sx={{ minHeight: 56, position: "relative", p: 0.5 }}
                        >
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
                                  cursor: "pointer",
                                  "&:hover": { filter: "brightness(0.92)" },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    mb: 0.3,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: colors.color,
                                    }}
                                  >
                                    {formatMinutes(appt.startMinutes ?? 0)} -{" "}
                                    {formatMinutes(appt.endMinutes ?? 0)}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: 12,
                                      color: colors.color,
                                      opacity: 0.8,
                                    }}
                                  >
                                    {appt.barberName}
                                  </Typography>
                                </Box>
                                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                  <Box
                                    component="li"
                                    sx={{ fontSize: 11, color: colors.color }}
                                  >
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
                                    cursor: "default",
                                    fontSize: 11,
                                    "&:hover": { opacity: 0.8 },
                                  }}
                                >
                                  {formatMinutes(appt.startMinutes ?? 0)} -{" "}
                                  {formatMinutes(appt.endMinutes ?? 0)}{" "}
                                  {appt.serviceName}, {appt.barberName}
                                </Box>
                              );
                            })}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                    p: 2,
                    bgcolor: "#f2f2f2",
                  }}
                >
                  {Object.entries(statusColorMap).map(([label, colors]) => (
                    <Box
                      key={label}
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "2px",
                          bgcolor: colors.bg,
                          border: `1px solid ${colors.color}`,
                        }}
                      />
                      <Typography sx={{ fontSize: 11, color: "#777" }}>
                        {label}
                      </Typography>
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
              width: { xs: "calc(100% - 24px)", sm: "650px" },
              maxWidth: "calc(100vw - 24px)",
              maxHeight: { xs: "calc(100% - 24px)", sm: "calc(100% - 64px)" },
              m: { xs: 1.5, sm: 3 },
              bgcolor: "#f2f2f2",
              borderRadius: 0,
            },
          },
        }}
      >
        <DialogTitle
          sx={{ fontWeight: 900, fontSize: { xs: 20, sm: 24 }, pb: 1, pr: 6 }}
        >
          Edit Appointment Details
          <IconButton
            onClick={() => setOpenEditModal(false)}
            sx={{ position: "absolute", right: 12, top: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {selectedAppointment && (
          <>
            <DialogContent
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                pt: 1,
                px: { xs: 2, sm: 3 },
              }}
            >
              <Typography sx={{ fontSize: 12, color: "#555" }}>
                Customer ID: {selectedAppointment.customerCode}
              </Typography>

              <TextField
                label="Name *"
                value={selectedAppointment.customerName}
                disabled
                size="small"
                sx={{ bgcolor: "#fff" }}
              />

              <TextField
                select
                label="Barber *"
                value={selectedAppointment.barberId || ""}
                disabled
                size="small"
                sx={{ bgcolor: "#fff" }}
                onChange={(e) => {
                  const barberId = e.target.value;

                  setSelectedAppointment((prev) =>
                    prev
                      ? {
                          ...prev,
                          barberId,
                          serviceId: "",
                          appointmentDate: "",
                          startMinutes: undefined,
                          endMinutes: undefined,
                          schedule: "",
                        }
                      : prev,
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
                    (service) => service.id === selectedAppointment.serviceId,
                  )
                    ? selectedAppointment.serviceId
                    : ""
                }
                disabled
                size="small"
                sx={{ bgcolor: "#fff" }}
                onChange={(e) =>
                  setSelectedAppointment((prev) =>
                    prev
                      ? {
                          ...prev,
                          serviceId: e.target.value,
                          appointmentDate: "",
                          startMinutes: undefined,
                          endMinutes: undefined,
                          schedule: "",
                        }
                      : prev,
                  )
                }
              >
                {services.map((service) => (
                  <MenuItem key={service.id} value={service.id}>
                    {service.name}
                  </MenuItem>
                ))}
              </TextField>

              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  label="Schedule *"
                  value={selectedAppointment.schedule || "Select schedule"}
                  disabled
                  fullWidth
                  size="small"
                  sx={{
                    bgcolor: "#fff",
                    "& .MuiInputBase-input.Mui-disabled": {
                      WebkitTextFillColor: "#111",
                    },
                  }}
                />

                <IconButton
                  disabled
                  sx={{
                    bgcolor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: 1,
                    width: 42,
                    height: 40,
                    "&:hover": {
                      bgcolor: "#eee",
                    },
                  }}
                >
                  <CalendarMonthIcon />
                </IconButton>
              </Box>

              <Button
                disabled
                sx={{
                  justifyContent: "flex-start",
                  color: "#777",
                  textTransform: "none",
                  fontSize: 13,
                  p: 0,
                  width: "fit-content",
                }}
              >
                + Add New Service
              </Button>

              <Box>
                <Typography sx={{ fontSize: 13, color: "#555", mb: 0.5 }}>
                  Proof of Downpayment <span style={{ color: "red" }}>*</span>
                </Typography>

                <Box
                  sx={{
                    bgcolor: "#fff",
                    minHeight: 38,
                    display: "flex",
                    alignItems: "center",
                    px: 1.5,
                  }}
                >
                  {selectedAppointment.paymentScreenshotUrl ? (
                    <Button
                      onClick={() => {
                        setImageViewerUrl(
                          selectedAppointment.paymentScreenshotUrl || "",
                        );
                        setImageViewerTitle("Proof of Downpayment");
                        setImageViewerOpen(true);
                      }}
                      sx={{
                        p: 0,
                        color: "#3b82f6",
                        textTransform: "none",
                        fontSize: 13,
                      }}
                    >
                      View Image
                    </Button>
                  ) : (
                    <Typography sx={{ color: "#999", fontSize: 13 }}>
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
                sx={{ bgcolor: "#fff" }}
                onChange={(e) =>
                  setSelectedAppointment((prev) =>
                    prev ? { ...prev, status: e.target.value } : prev,
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
                <Typography sx={{ fontSize: 13, color: "#555", mb: 0.5 }}>
                  After Service Photos
                </Typography>

                <Box
                  sx={{
                    bgcolor: "#fff",
                    minHeight: 38,
                    display: "flex",
                    alignItems: "center",
                    px: 1.5,
                    gap: 1,
                  }}
                >
                  {getAfterServicePhotos(selectedAppointment).length > 0 ? (
                    getAfterServicePhotos(selectedAppointment).map(
                      (photo, index) => (
                        <Button
                          key={photo.id || photo.imageUrl}
                          onClick={() => {
                            openImageViewer(
                              "After Service Photos",
                              getAfterServicePhotos(selectedAppointment),
                              index,
                            );
                          }}
                          sx={{
                            p: 0,
                            color: "#3b82f6",
                            textTransform: "none",
                            fontSize: 13,
                          }}
                        >
                          View Image {index + 1}
                        </Button>
                      ),
                    )
                  ) : (
                    <Typography sx={{ color: "#999", fontSize: 13 }}>
                      No after service photos
                    </Typography>
                  )}
                </Box>

                {canUploadAfterServicePhoto ? (
                  <Button
                    component="label"
                    sx={{
                      mt: 1,
                      bgcolor: "#fff",
                      color: "#555",
                      border: "1px solid #ccc",
                      textTransform: "none",
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
                        formData.append("file", file);

                        try {
                          const uploadRes = await fetch("/api/upload", {
                            method: "POST",
                            body: formData,
                          });

                          const uploadText = await uploadRes.text();
                          console.log("UPLOAD STATUS:", uploadRes.status);
                          console.log("UPLOAD RAW RESPONSE:", uploadText);

                          let uploadData: UploadResponse = {};
                          try {
                            uploadData = uploadText
                              ? (JSON.parse(uploadText) as UploadResponse)
                              : {};
                          } catch (parseError) {
                            console.error(
                              "UPLOAD JSON PARSE ERROR:",
                              parseError,
                            );
                          }

                          console.log("UPLOAD PARSED RESPONSE:", uploadData);

                          if (!uploadRes.ok || !uploadData.url) {
                            alert(
                              uploadData.error || "Failed to upload photo.",
                            );
                            return;
                          }

                          const uploadedUrl = uploadData.url;

                          if (!uploadedUrl) {
                            alert(
                              uploadData.error || "Failed to upload photo.",
                            );
                            return;
                          }

                          setPendingAfterServicePhotoUrls((prev) => [
                            ...prev,
                            uploadedUrl,
                          ]);

                          setSelectedAppointment((prev) => {
                            if (!prev) return prev;

                            const newPhoto = {
                              id: `temp-${Date.now()}`,
                              imageUrl: uploadedUrl,
                              createdAt: new Date().toISOString(),
                            };

                            const updated: Appointment = {
                              ...prev,
                              afterServicePhotoUrl: uploadedUrl,
                              afterServicePhotos: [
                                newPhoto,
                                ...(prev.afterServicePhotos || []),
                              ],
                            };

                            console.log("PHOTO URL SET TO STATE:", uploadedUrl);
                            console.log("UPDATED APPOINTMENT STATE:", updated);

                            return updated;
                          });
                        } catch (error) {
                          console.error(
                            "UPLOAD AFTER SERVICE PHOTO ERROR:",
                            error,
                          );
                          alert("Failed to upload photo.");
                        }
                      }}
                    />
                  </Button>
                ) : (
                  <Typography sx={{ color: "error.main", fontSize: 13, mt: 1 }}>
                    After-service photos can only be uploaded for completed
                    appointments.
                  </Typography>
                )}
              </Box>
            </DialogContent>

            <DialogActions
              sx={{
                px: { xs: 2, sm: 3 },
                pb: { xs: 2, sm: 3 },
                justifyContent: "center",
                flexDirection: { xs: "column-reverse", sm: "row" },
                gap: 2,
              }}
            >
              <Button
                onClick={() => {
                  setOpenEditModal(false);
                }}
                sx={{
                  backgroundColor: "#777",
                  color: "#f4b400",
                  width: { xs: "100%", sm: 180 },
                  minHeight: 44,
                  py: 1,
                  borderRadius: 1,
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": {
                    backgroundColor: "#666",
                  },
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={handleUpdateAppointment}
                disabled={
                  !canUploadAfterServicePhoto ||
                  pendingAfterServicePhotoUrls.length === 0 ||
                  saving
                }
                sx={{
                  backgroundColor: "#000",
                  color: "#f4b400",
                  width: { xs: "100%", sm: 180 },
                  minHeight: 44,
                  py: 1,
                  borderRadius: 1,
                  textTransform: "none",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  "&:hover": {
                    backgroundColor: "#111",
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "#ccc",
                    color: "#777",
                  },
                }}
              >
                {saving
                  ? "Saving..."
                  : pendingAfterServicePhotoUrls.length > 1
                    ? "Save Photos"
                    : "Save Photo"}
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
        <DialogTitle sx={{ fontWeight: 800 }}>Upload Confirmed</DialogTitle>

        <DialogContent>
          <Typography>{photoSuccessMessage}</Typography>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setPhotoSuccessOpen(false)}
            sx={{
              bgcolor: "#000",
              color: "#f4b400",
              px: 4,
              "&:hover": {
                bgcolor: "#111",
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
        slotProps={{
          paper: {
            sx: {
              m: { xs: 1.5, sm: 3 },
              width: { xs: "calc(100% - 24px)", sm: "100%" },
              maxHeight: { xs: "calc(100% - 24px)", sm: "calc(100% - 64px)" },
            },
          },
        }}
      >
        <DialogTitle
          sx={{ fontWeight: 800, fontSize: { xs: 18, sm: 22 }, pr: 6 }}
        >
          {imageViewerTitle}
          {imageViewerPhotos.length > 1 && (
            <Typography
              component="span"
              sx={{ ml: 1, color: "#777", fontSize: 13 }}
            >
              ({imageViewerIndex + 1} of {imageViewerPhotos.length})
            </Typography>
          )}

          <IconButton
            onClick={() => setImageViewerOpen(false)}
            sx={{ position: "absolute", right: 12, top: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            bgcolor: "#f5f5f5",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: { xs: 1.5, sm: 3 },
          }}
        >
          {imageViewerUrl ? (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: { xs: 0.75, sm: 2 },
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
                    setImageViewerUrl(
                      imageViewerPhotos[nextIndex]?.imageUrl || "",
                    );
                  }}
                  sx={{
                    bgcolor: "#fff",
                    border: "1px solid #ddd",
                    "&:hover": { bgcolor: "#eee" },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>

                <Box
                  component="img"
                  src={imageViewerUrl}
                  alt={imageViewerTitle || "Appointment image"}
                  sx={{
                    width: "100%",
                    maxWidth: 820,
                    maxHeight: { xs: "62vh", sm: "68vh" },
                    objectFit: "contain",
                    borderRadius: 2,
                    bgcolor: "#fff",
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
                    setImageViewerUrl(
                      imageViewerPhotos[nextIndex]?.imageUrl || "",
                    );
                  }}
                  sx={{
                    bgcolor: "#fff",
                    border: "1px solid #ddd",
                    "&:hover": { bgcolor: "#eee" },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Box>

              {imageViewerPhotos.length > 1 && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 1,
                    flexWrap: "wrap",
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
                        objectFit: "cover",
                        borderRadius: 1,
                        cursor: "pointer",
                        border:
                          index === imageViewerIndex
                            ? "2px solid #000"
                            : "1px solid #ccc",
                        bgcolor: "#fff",
                      }}
                    />
                  ))}
                </Box>
              )}
            </>
          ) : (
            <Typography sx={{ color: "#777", textAlign: "center" }}>
              No image available.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function AppointmentMobileCard({
  appointment,
  amount,
  statusColor,
  onOpen,
}: {
  appointment: Appointment;
  amount: string;
  statusColor: string;
  onOpen: () => void;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        border: "1px solid #e5e5e5",
        borderRadius: 1,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 1.5,
          mb: 1.25,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: "#777", fontSize: 12, fontWeight: 800 }}>
            {appointment.appointmentCode}
          </Typography>
          <Typography
            sx={{
              fontSize: 17,
              fontWeight: 900,
              lineHeight: 1.2,
              overflowWrap: "anywhere",
            }}
          >
            {appointment.customerName}
          </Typography>
        </Box>

        <IconButton
          size="small"
          color="primary"
          aria-label="view appointment"
          onClick={onOpen}
          sx={{
            width: 36,
            height: 36,
            bgcolor: "#f5f5f5",
            flexShrink: 0,
          }}
        >
          <InfoIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 1,
          mb: 1.25,
        }}
      >
        <AppointmentCardDetail
          label="Customer ID"
          value={appointment.customerCode}
        />
        <AppointmentCardDetail
          label="Status"
          value={appointment.status}
          color={statusColor}
          align="right"
        />
        <AppointmentCardDetail
          label="Schedule"
          value={appointment.schedule || "N/A"}
        />
        <AppointmentCardDetail label="Amount" value={amount} align="right" />
      </Box>

      <AppointmentCardDetail
        label="Service"
        value={appointment.serviceName || "N/A"}
      />
    </Paper>
  );
}

function AppointmentCardDetail({
  label,
  value,
  color = "#111",
  align = "left",
}: {
  label: string;
  value: string;
  color?: string;
  align?: "left" | "right";
}) {
  return (
    <Box sx={{ minWidth: 0, textAlign: align }}>
      <Typography sx={{ color: "#777", fontSize: 12, fontWeight: 800 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          color,
          fontSize: 13,
          fontWeight: 900,
          lineHeight: 1.25,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
