import { DateTime } from 'luxon'

// 
export const todayCodePH = () => {
  return nowInPH().toFormat('yyyyMMdd'); // e.g. "20260623"
};

// For UTC strings from DB (converts UTC → PH time)
export const utcToPH = (date: Date | string) => {
  return DateTime.fromJSDate(new Date(date), { zone: 'utc' }).setZone('Asia/Manila');
};

// For local/ambiguous date strings (just views them as PH time)
export const toPhilippineTime = (date: Date | string) => {
  return DateTime.fromJSDate(new Date(date)).setZone('Asia/Manila');
};

export const formatPHTime = (date: Date | string, format = 'yyyy-MM-dd hh:mm a') => {
  return utcToPH(date).toFormat(format);
};

// Get current date/time in Philippine time
export const nowInPH = () => {
  return DateTime.now().setZone('Asia/Manila');
};

// Get a JS Date representing today midnight in PH time
export const todayPH = () => {
  return nowInPH().startOf('day').toJSDate();
};

export const toPHDateKey = (value: Date | string | null | undefined) => {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return DateTime.fromJSDate(parsed, { zone: 'utc' })
    .setZone('Asia/Manila')
    .toFormat('yyyy-MM-dd');
};

export const parsePHDateOnly = (value: Date | string) => {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: 'utc' })
      .setZone('Asia/Manila')
      .startOf('day')
      .toJSDate();
  }

  return DateTime.fromISO(String(value), { zone: 'Asia/Manila' })
    .startOf('day')
    .toJSDate();
};