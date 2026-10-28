import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import { addMinutes, isValid } from "date-fns";
import { env } from "../config.js";

export function parseLocalDateTime(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Use local date/time format YYYY-MM-DDTHH:mm.");
  const [, y, mo, d, h, mi] = match;
  const year = Number(y), month = Number(mo), day = Number(d), hour = Number(h), minute = Number(mi);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) throw new Error("Invalid date or time.");
  const utc = fromZonedTime(`${value}:00`, env.TIME_ZONE);
  if (!isValid(utc)) throw new Error("Invalid date or time.");
  const local = formatInTimeZone(utc, env.TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
  if (local !== value) throw new Error("Invalid local date/time.");
  return utc;
}

export function localDateTime(date: Date): string {
  return formatInTimeZone(date, env.TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
}

export function validateInterval(start: Date, end: Date) {
  if (end <= start) throw new Error("End time must be after start time.");
  if (start.getMinutes() % 30 !== 0 || end.getMinutes() % 30 !== 0 || start.getSeconds() !== 0 || end.getSeconds() !== 0) {
    throw new Error("Reservations must align to 30-minute boundaries.");
  }
  if (end.getTime() - start.getTime() > 4 * 60 * 60 * 1000) throw new Error("Reservations may not exceed four hours.");
  const day = Number(formatInTimeZone(start, env.TIME_ZONE, "i")); // 1=Mon, 7=Sun
  const startTime = formatInTimeZone(start, env.TIME_ZONE, "HH:mm");
  const endTime = formatInTimeZone(end, env.TIME_ZONE, "HH:mm");
  if (day === 7) throw new Error("Rooms are closed on Sundays.");
  if (startTime < "07:00" || endTime > "21:00") throw new Error("Operating hours are 07:00–21:00, Monday–Saturday.");
}
export function addSlot(date: Date, minutes: number) { return addMinutes(date, minutes); }
