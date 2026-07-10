import { DateTime } from "luxon";

export const DASHBOARD_TIME_ZONE = "Asia/Manila";

export type DashboardPeriod = "Day" | "Week" | "Month" | "custom";
export type DashboardGrouping = "day" | "week" | "month";

export type DashboardDateRange = {
  period: DashboardPeriod;
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  grouping: DashboardGrouping;
  dayCount: number;
  from: string;
  to: string;
  fromTime: string;
  toTime: string;
};

export type DashboardTrendBucket = {
  key: string;
  label: string;
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export class DashboardDateRangeError extends Error {}

function parseDateOnly(value: string | null | undefined): DateTime | null {
  if (!value || !DATE_ONLY_RE.test(value)) return null;

  const parsed = DateTime.fromFormat(value, "yyyy-MM-dd", {
    zone: DASHBOARD_TIME_ZONE,
  });

  return parsed.isValid && parsed.toFormat("yyyy-MM-dd") === value ? parsed : null;
}

function toDateTime(value: Date) {
  return DateTime.fromJSDate(value).setZone(DASHBOARD_TIME_ZONE);
}

function inclusiveDayCount(start: DateTime, end: DateTime) {
  return Math.floor(end.startOf("day").diff(start.startOf("day"), "days").days) + 1;
}

function groupingForDayCount(dayCount: number): DashboardGrouping {
  if (dayCount <= 31) return "day";
  if (dayCount <= 90) return "week";
  return "month";
}

function formatDateOnly(value: DateTime) {
  return value.toFormat("yyyy-MM-dd");
}

function formatTimeOnly(value: DateTime) {
  return value.toFormat("HH:mm");
}

function parseTimeOnly(value: string | null | undefined): DateTime | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;

  const parsed = DateTime.fromFormat(value, "HH:mm", {
    zone: DASHBOARD_TIME_ZONE,
  });

  return parsed.isValid && parsed.toFormat("HH:mm") === value ? parsed : null;
}

function combineDateTime(date: DateTime, time: DateTime) {
  return DateTime.fromObject(
    {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: time.hour,
      minute: time.minute,
      second: 0,
      millisecond: 0,
    },
    { zone: DASHBOARD_TIME_ZONE },
  );
}

export function getDefaultDashboardCustomRange(now = new Date()) {
  const today = toDateTime(now);

  return {
    from: formatDateOnly(today.startOf("month")),
    to: formatDateOnly(today),
    fromTime: "00:00",
    toTime: formatTimeOnly(today.endOf("day")),
  };
}

export function validateDashboardCustomRange(
  from: string,
  to: string,
  fromTime: string,
  toTime: string,
  now = new Date(),
): string {
  const startDate = parseDateOnly(from);
  const endDate = parseDateOnly(to);
  const startTime = parseTimeOnly(fromTime);
  const endTime = parseTimeOnly(toTime);

  if (!from || !to) {
    return "Date From and Date To are required.";
  }

  if (!fromTime || !toTime) {
    return "Time From and Time To are required.";
  }

  if (!startDate || !endDate) {
    return "Use valid dates in YYYY-MM-DD format.";
  }

  if (!startTime || !endTime) {
    return "Use valid times in HH:mm format.";
  }

  const currentStart = combineDateTime(startDate.startOf("day"), startTime);
  const currentEnd = combineDateTime(endDate.startOf("day"), endTime);

  if (currentStart > currentEnd) {
    return "Date From and Time From must not be later than Date To and Time To.";
  }

  if (startDate.startOf("day") > endDate.startOf("day")) {
    return "Date From must not be later than Date To.";
  }

  const today = toDateTime(now).startOf("day");
  if (endDate.startOf("day") > today) {
    return "Date To must not be later than today.";
  }

  const nowTime = toDateTime(now);
  if (endDate.startOf("day").equals(today) && currentEnd > nowTime) {
    return "Time To must not be later than the current time.";
  }

  return "";
}

export function resolveDashboardDateRange({
  period,
  from,
  to,
  fromTime,
  toTime,
  now = new Date(),
}: {
  period: DashboardPeriod;
  from?: string | null;
  to?: string | null;
  fromTime?: string | null;
  toTime?: string | null;
  now?: Date;
}): DashboardDateRange {
  const nowDate = toDateTime(now);
  let currentStart: DateTime;
  let currentEnd: DateTime;
  let previousStart: DateTime;
  let previousEnd: DateTime;

  if (period === "custom") {
    const validationMessage = validateDashboardCustomRange(
      from ?? "",
      to ?? "",
      fromTime ?? "",
      toTime ?? "",
      now,
    );
    if (validationMessage) {
      throw new DashboardDateRangeError(validationMessage);
    }

    currentStart = combineDateTime(parseDateOnly(from)!.startOf("day"), parseTimeOnly(fromTime)!);
    currentEnd = combineDateTime(parseDateOnly(to)!.startOf("day"), parseTimeOnly(toTime)!);
    const days = inclusiveDayCount(currentStart, currentEnd);
    previousStart = currentStart.minus({ days });
    previousEnd = currentEnd.minus({ days });

    return {
      period,
      currentStart: currentStart.toJSDate(),
      currentEnd: currentEnd.toJSDate(),
      previousStart: previousStart.toJSDate(),
      previousEnd: previousEnd.toJSDate(),
      grouping: groupingForDayCount(days),
      dayCount: days,
      from: formatDateOnly(currentStart),
      to: formatDateOnly(currentEnd),
      fromTime: formatTimeOnly(currentStart),
      toTime: formatTimeOnly(currentEnd),
    };
  }

  if (period === "Week") {
    const daysSinceSunday = nowDate.weekday % 7;
    currentStart = nowDate.startOf("day").minus({ days: daysSinceSunday });
    currentEnd = currentStart.plus({ days: 6 }).endOf("day");
    previousStart = currentStart.minus({ days: 7 });
    previousEnd = currentStart.minus({ days: 1 }).endOf("day");
  } else if (period === "Month") {
    currentStart = nowDate.startOf("month");
    currentEnd = nowDate.endOf("month");
    previousStart = currentStart.minus({ months: 1 }).startOf("month");
    previousEnd = previousStart.endOf("month");
  } else {
    currentStart = nowDate.startOf("day");
    currentEnd = nowDate.endOf("day");
    previousStart = currentStart.minus({ days: 1 });
    previousEnd = currentStart.minus({ days: 1 }).endOf("day");
  }

  const days = inclusiveDayCount(currentStart, currentEnd);

  return {
    period,
    currentStart: currentStart.toJSDate(),
    currentEnd: currentEnd.toJSDate(),
    previousStart: previousStart.toJSDate(),
    previousEnd: previousEnd.toJSDate(),
    grouping: groupingForDayCount(days),
    dayCount: days,
    from: formatDateOnly(currentStart),
    to: formatDateOnly(currentEnd),
    fromTime: formatTimeOnly(currentStart),
    toTime: formatTimeOnly(currentEnd),
  };
}

export function toDashboardDateTime(date: Date) {
  return DateTime.fromJSDate(date).setZone(DASHBOARD_TIME_ZONE);
}

export function isInDashboardRange(date: Date, start: Date, end: Date) {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function createDashboardTrendBuckets(
  range: DashboardDateRange,
): DashboardTrendBucket[] {
  const start = toDashboardDateTime(range.currentStart).startOf("day");
  const end = toDashboardDateTime(range.currentEnd).startOf("day");
  const buckets: DashboardTrendBucket[] = [];

  if (range.grouping === "day") {
    for (let cursor = start; cursor <= end; cursor = cursor.plus({ days: 1 })) {
      buckets.push({
        key: cursor.toFormat("yyyy-MM-dd"),
        label: cursor.toFormat("MMM d"),
      });
    }
    return buckets;
  }

  if (range.grouping === "week") {
    const weekCount = Math.ceil(range.dayCount / 7);
    for (let index = 0; index < weekCount; index++) {
      buckets.push({
        key: `week-${index + 1}`,
        label: `Week ${index + 1}`,
      });
    }
    return buckets;
  }

  for (
    let cursor = start.startOf("month");
    cursor <= end;
    cursor = cursor.plus({ months: 1 }).startOf("month")
  ) {
    buckets.push({
      key: cursor.toFormat("yyyy-MM"),
      label: cursor.toFormat("MMM yyyy"),
    });
  }

  return buckets;
}

export function getDashboardTrendBucketKey(date: Date, range: DashboardDateRange) {
  const dateTime = toDashboardDateTime(date).startOf("day");
  const start = toDashboardDateTime(range.currentStart).startOf("day");

  if (range.grouping === "day") {
    return dateTime.toFormat("yyyy-MM-dd");
  }

  if (range.grouping === "week") {
    const dayOffset = Math.floor(dateTime.diff(start, "days").days);
    return `week-${Math.floor(dayOffset / 7) + 1}`;
  }

  return dateTime.toFormat("yyyy-MM");
}
