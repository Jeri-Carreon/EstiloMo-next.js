import type { Prisma } from "@prisma/client";
import { DateTime } from "luxon";

export const PH_TIME_ZONE = "Asia/Manila";
export const DEFAULT_CANDIDATE_INTERVAL_MINUTES = 15;

const BLOCKING_APPOINTMENT_STATUSES = ["PENDING", "SCHEDULED"] as const;

export interface TimeRange {
  startMinutes: number;
  endMinutes: number;
}

export interface AvailableTime extends TimeRange {
  label: string;
}

type SchedulingDbClient = Pick<
  Prisma.TransactionClient,
  "barberSchedule" | "barberAbsent" | "appointment" | "appointmentSetting"
>;

export class AppointmentAvailabilityError extends Error {
  status = 400;
}

function rangesOverlap(
  requestedStartMinutes: number,
  requestedEndMinutes: number,
  existingRange: TimeRange
) {
  return (
    requestedStartMinutes < existingRange.endMinutes &&
    requestedEndMinutes > existingRange.startMinutes
  );
}

function formatMinutes(minutes: number) {
  const hour24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${mins.toString().padStart(2, "0")}${suffix}`;
}

export function resolveCandidateIntervalMinutes(value?: string | number | null) {
  const rawValue =
    value ?? process.env.APPOINTMENT_START_INTERVAL_MINUTES ?? "";
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_CANDIDATE_INTERVAL_MINUTES;
  }

  return Math.min(Math.floor(parsed), 480);
}

export function parseTimeRangesParam(value: string | null): TimeRange[] {
  if (!value) return [];

  return value
    .split(",")
    .map((range) => {
      const [start, end] = range.split("-").map(Number);

      return {
        startMinutes: start,
        endMinutes: end,
      };
    })
    .filter(
      (range) =>
        Number.isFinite(range.startMinutes) &&
        Number.isFinite(range.endMinutes) &&
        range.endMinutes > range.startMinutes
    );
}

function normalizeTimeRanges(ranges: TimeRange[]) {
  const sortedRanges = ranges
    .filter(
      (range) =>
        Number.isFinite(range.startMinutes) &&
        Number.isFinite(range.endMinutes) &&
        range.endMinutes > range.startMinutes
    )
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const mergedRanges: TimeRange[] = [];

  for (const range of sortedRanges) {
    const previous = mergedRanges[mergedRanges.length - 1];

    if (!previous || range.startMinutes > previous.endMinutes) {
      mergedRanges.push({ ...range });
      continue;
    }

    previous.endMinutes = Math.max(previous.endMinutes, range.endMinutes);
  }

  return mergedRanges;
}

export function generateAvailableTimes(params: {
  workingStartMinutes: number;
  workingEndMinutes: number;
  serviceDurationMinutes: number;
  candidateIntervalMinutes?: number;
  busyRanges?: TimeRange[];
  isStartAllowed?: (startMinutes: number, endMinutes: number) => boolean;
}): AvailableTime[] {
  const intervalMinutes = resolveCandidateIntervalMinutes(
    params.candidateIntervalMinutes
  );
  const serviceDurationMinutes = Math.floor(params.serviceDurationMinutes);

  if (
    !Number.isFinite(params.workingStartMinutes) ||
    !Number.isFinite(params.workingEndMinutes) ||
    !Number.isFinite(serviceDurationMinutes) ||
    serviceDurationMinutes <= 0 ||
    params.workingEndMinutes <= params.workingStartMinutes
  ) {
    return [];
  }

  const busyRanges = normalizeTimeRanges(params.busyRanges ?? []);
  const availableTimes: AvailableTime[] = [];
  let busyIndex = 0;

  for (
    let start = params.workingStartMinutes;
    start + serviceDurationMinutes <= params.workingEndMinutes;
    start += intervalMinutes
  ) {
    const end = start + serviceDurationMinutes;

    if (params.isStartAllowed && !params.isStartAllowed(start, end)) {
      continue;
    }

    // Busy ranges are sorted and merged, so this pointer advances once across
    // the day instead of scanning every appointment for every candidate time.
    while (
      busyIndex < busyRanges.length &&
      busyRanges[busyIndex].endMinutes <= start
    ) {
      busyIndex += 1;
    }

    const nextBusyRange = busyRanges[busyIndex];
    const overlapsBusyRange =
      nextBusyRange &&
      start < nextBusyRange.endMinutes &&
      end > nextBusyRange.startMinutes;

    if (overlapsBusyRange) {
      continue;
    }

    availableTimes.push({
      startMinutes: start,
      endMinutes: end,
      label: `${formatMinutes(start)} - ${formatMinutes(end)}`,
    });
  }

  return availableTimes;
}

export async function getDynamicAvailabilityForDate(
  client: SchedulingDbClient,
  params: {
    barberId: string;
    date: string;
    serviceDurationMinutes: number;
    candidateIntervalMinutes?: number;
    blockedRanges?: TimeRange[];
    breakRanges?: TimeRange[];
    excludeAppointmentId?: string;
    nowPH?: DateTime;
  }
) {
  const targetDate = DateTime.fromISO(params.date, { zone: PH_TIME_ZONE });

  if (!targetDate.isValid) {
    throw new AppointmentAvailabilityError("Invalid appointment date");
  }

  const dayOfWeek = targetDate.weekday % 7;

  const schedule = await client.barberSchedule.findUnique({
    where: {
      barberId_dayOfWeek: {
        barberId: params.barberId,
        dayOfWeek,
      },
    },
  });

  const startOfDay = targetDate.startOf("day").toUTC().toJSDate();
  const endOfDay = targetDate.endOf("day").toUTC().toJSDate();

  const absence = await client.barberAbsent.findFirst({
    where: {
      barberId: params.barberId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (!schedule || schedule.isDayOff || absence) {
    return {
      availableTimes: [],
      isDisabledDay: true,
    };
  }

  const appointmentWhere: Prisma.AppointmentWhereInput = {
    barberId: params.barberId,
    appointmentDate: {
      gte: startOfDay,
      lte: endOfDay,
    },
    status: {
      in: [...BLOCKING_APPOINTMENT_STATUSES],
    },
  };

  if (params.excludeAppointmentId) {
    appointmentWhere.id = {
      not: params.excludeAppointmentId,
    };
  }

  const appointments = await client.appointment.findMany({
    where: appointmentWhere,
    select: {
      startMinutes: true,
      endMinutes: true,
    },
  });

  const setting = await client.appointmentSetting.findFirst();
  const cutoffPH = (params.nowPH ?? DateTime.now().setZone(PH_TIME_ZONE)).plus({
    hours: setting?.bookingCutoffHours ?? 1,
  });
  const targetStartPH = targetDate.startOf("day");

  const availableTimes = generateAvailableTimes({
    workingStartMinutes: schedule.startTime,
    workingEndMinutes: schedule.endTime,
    serviceDurationMinutes: params.serviceDurationMinutes,
    candidateIntervalMinutes: params.candidateIntervalMinutes,
    busyRanges: [
      ...appointments,
      ...(params.blockedRanges ?? []),
      ...(params.breakRanges ?? []),
    ],
    isStartAllowed: (startMinutes) =>
      targetStartPH.plus({ minutes: startMinutes }) >= cutoffPH,
  });

  return {
    availableTimes,
    isDisabledDay: false,
  };
}

export async function assertAppointmentTimeAvailable(
  client: SchedulingDbClient,
  params: {
    barberId: string;
    date: string;
    serviceDurationMinutes: number;
    startMinutes: number;
    endMinutes: number;
    candidateIntervalMinutes?: number;
    blockedRanges?: TimeRange[];
    breakRanges?: TimeRange[];
    excludeAppointmentId?: string;
  }
) {
  const startMinutes = Number(params.startMinutes);
  const endMinutes = Number(params.endMinutes);
  const serviceDurationMinutes = Math.floor(params.serviceDurationMinutes);

  if (
    !Number.isFinite(startMinutes) ||
    !Number.isFinite(endMinutes) ||
    !Number.isFinite(serviceDurationMinutes) ||
    serviceDurationMinutes <= 0 ||
    endMinutes <= startMinutes
  ) {
    throw new AppointmentAvailabilityError("Invalid appointment time");
  }

  if (endMinutes !== startMinutes + serviceDurationMinutes) {
    throw new AppointmentAvailabilityError(
      "Appointment duration does not match the selected service"
    );
  }

  const availability = await getDynamicAvailabilityForDate(client, params);

  if (availability.isDisabledDay) {
    throw new AppointmentAvailabilityError(
      "Selected date is not available for this barber"
    );
  }

  const isAvailable = availability.availableTimes.some(
    (time) =>
      time.startMinutes === startMinutes && time.endMinutes === endMinutes
  );

  if (!isAvailable) {
    throw new AppointmentAvailabilityError(
      "Selected appointment time is no longer available"
    );
  }
}

export async function assertCustomerAppointmentTimeAvailable(
  client: SchedulingDbClient,
  params: {
    customerId?: string | null;
    customerEmail?: string | null;
    customerMobileNumber?: string | null;
    date: string;
    startMinutes: number;
    endMinutes: number;
    blockedRanges?: TimeRange[];
    excludeAppointmentId?: string;
  }
) {
  const startMinutes = Number(params.startMinutes);
  const endMinutes = Number(params.endMinutes);

  if (
    !Number.isFinite(startMinutes) ||
    !Number.isFinite(endMinutes) ||
    endMinutes <= startMinutes
  ) {
    throw new AppointmentAvailabilityError("Invalid appointment time");
  }

  const cartConflict = (params.blockedRanges ?? []).some((range) =>
    rangesOverlap(startMinutes, endMinutes, range)
  );

  if (cartConflict) {
    throw new AppointmentAvailabilityError(
      "You already have an appointment that overlaps with this selected time."
    );
  }

  const targetDate = DateTime.fromISO(params.date, { zone: PH_TIME_ZONE });

  if (!targetDate.isValid) {
    throw new AppointmentAvailabilityError("Invalid appointment date");
  }

  const existingBusyRanges = await getCustomerAppointmentBusyRanges(client, {
    customerId: params.customerId,
    customerEmail: params.customerEmail,
    customerMobileNumber: params.customerMobileNumber,
    date: params.date,
    excludeAppointmentId: params.excludeAppointmentId,
  });

  const appointmentConflict = existingBusyRanges.some((range) =>
    rangesOverlap(startMinutes, endMinutes, range)
  );

  if (appointmentConflict) {
    throw new AppointmentAvailabilityError(
      "You already have an appointment that overlaps with this selected time."
    );
  }
}

export async function getCustomerAppointmentBusyRanges(
  client: SchedulingDbClient,
  params: {
    customerId?: string | null;
    customerEmail?: string | null;
    customerMobileNumber?: string | null;
    date: string;
    excludeAppointmentId?: string;
  }
) {
  const targetDate = DateTime.fromISO(params.date, { zone: PH_TIME_ZONE });

  if (!targetDate.isValid) {
    throw new AppointmentAvailabilityError("Invalid appointment date");
  }

  const customerIdentityFilters: Prisma.AppointmentWhereInput[] = [];

  if (params.customerId) {
    customerIdentityFilters.push({ customerId: params.customerId });
  }

  if (params.customerEmail) {
    customerIdentityFilters.push({
      customer: {
        OR: [{ email: params.customerEmail }, { user: { email: params.customerEmail } }],
      },
    });
  }

  if (params.customerMobileNumber) {
    customerIdentityFilters.push({
      customer: {
        mobileNumber: params.customerMobileNumber,
      },
    });
  }

  if (customerIdentityFilters.length === 0) {
    return [];
  }

  const appointmentWhere: Prisma.AppointmentWhereInput = {
    appointmentDate: {
      gte: targetDate.startOf("day").toUTC().toJSDate(),
      lte: targetDate.endOf("day").toUTC().toJSDate(),
    },
    status: {
      in: [...BLOCKING_APPOINTMENT_STATUSES],
    },
    OR: customerIdentityFilters,
  };

  if (params.excludeAppointmentId) {
    appointmentWhere.id = {
      not: params.excludeAppointmentId,
    };
  }

  const appointments = await client.appointment.findMany({
    where: appointmentWhere,
    select: {
      startMinutes: true,
      endMinutes: true,
    },
  });

  return appointments;
}
