export const TIME_ZONE = 'America/Sao_Paulo';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(instant: Date): ZonedParts {
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) {
    parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0');
}

/** Offset of the local time zone at the given instant, in minutes east of UTC. */
function offsetMinutes(instant: Date): number {
  const p = zonedParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const truncated = Math.floor(instant.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / 60000);
}

export function now(): Date {
  return new Date();
}

/** Calendar date (YYYY-MM-DD) of the instant in the local time zone. */
export function localDate(instant: Date): string {
  const p = zonedParts(instant);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

export function today(at: Date = now()): string {
  return localDate(at);
}

/** ISO 8601 with the local offset, e.g. 2026-11-20T20:00:00-03:00. */
export function toIso(instant: Date): string {
  const p = zonedParts(instant);
  const offset = offsetMinutes(instant);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  return (
    `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

export function toIsoOrNull(instant: Date | null): string | null {
  return instant ? toIso(instant) : null;
}

/** Instant for a wall-clock date and time (HH:mm) in the local time zone. */
export function localDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let instant = new Date(wallAsUtc - offsetMinutes(new Date(wallAsUtc)) * 60000);
  const corrected = new Date(wallAsUtc - offsetMinutes(instant) * 60000);
  if (corrected.getTime() !== instant.getTime()) {
    instant = corrected;
  }
  return instant;
}

function parseDate(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function formatUtcDate(value: Date): string {
  return `${pad(value.getUTCFullYear(), 4)}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDate(date);
  return formatUtcDate(new Date(Date.UTC(year, month - 1, day + days)));
}

/** Same month and day, n years later (or earlier); 29/02 falls back to 28/02 when needed. */
export function addYears(date: string, years: number): string {
  const { year, month, day } = parseDate(date);
  const target = year + years;
  const lastDay = new Date(Date.UTC(target, month, 0)).getUTCDate();
  return formatUtcDate(new Date(Date.UTC(target, month - 1, Math.min(day, lastDay))));
}

/** Number of calendar days from `from` to `to`. */
export function daysBetween(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86400000,
  );
}

/** Completed years of age on the reference date. */
export function ageOn(birthDate: string, referenceDate: string): number {
  const birth = parseDate(birthDate);
  const ref = parseDate(referenceDate);
  let age = ref.year - birth.year;
  if (ref.month < birth.month || (ref.month === birth.month && ref.day < birth.day)) {
    age -= 1;
  }
  return age;
}

/** Validates a YYYY-MM-DD calendar date. */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseDate(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Current year and month in the local time zone. */
export function currentYearMonth(at: Date = now()): { year: number; month: number } {
  const p = zonedParts(at);
  return { year: p.year, month: p.month };
}
