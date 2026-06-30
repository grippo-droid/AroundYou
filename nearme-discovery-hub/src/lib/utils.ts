import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Maps day names (full and abbreviated) to JS getDay() values (0 = Sun)
const DAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

// Returns minutes since midnight for strings like "7:00 AM" or "11:30 PM"
function parseMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return -1;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "AM" && hours === 12) hours = 0;       // 12:xx AM → midnight
  if (period === "PM" && hours !== 12) hours += 12;     // 1–11 PM → add 12
  return hours * 60 + minutes;
}

// Returns true if `currentDay` (0–6) falls within the day descriptor,
// e.g. "Mon-Fri", "Sat-Sun", "Daily", "Sun"
function dayMatches(currentDay: number, dayStr: string): boolean {
  const s = dayStr.trim();
  if (s.toLowerCase() === "daily") return true;

  if (s.includes("-")) {
    const [startAbbr, endAbbr] = s.split("-").map((d) => d.trim());
    const start = DAY_INDEX[startAbbr];
    const end = DAY_INDEX[endAbbr];
    if (start === undefined || end === undefined) return false;
    // Normal range (e.g. Mon=1 to Fri=5) or wrap-around (e.g. Sat=6 to Sun=0)
    return start <= end
      ? currentDay >= start && currentDay <= end
      : currentDay >= start || currentDay <= end;
  }

  return DAY_INDEX[s] === currentDay;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function isBusinessOpen(timings: { day: string; hours: string }[]): boolean {
  if (!timings || timings.length === 0) return false;

  const now = new Date();
  const currentDay = now.getDay();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  for (const timing of timings) {
    if (!dayMatches(currentDay, timing.day)) continue;

    const hoursStr = timing.hours.trim();
    if (hoursStr.toLowerCase() === "closed") return false;

    const parts = hoursStr.split(/\s[–\-]\s/);
    if (parts.length !== 2) continue;

    const open = parseMinutes(parts[0]);
    const close = parseMinutes(parts[1]);
    if (open === -1 || close === -1) continue;

    // Handle overnight hours (e.g. "10:00 PM - 2:00 AM")
    if (close < open) {
      return currentMins >= open || currentMins <= close;
    }
    return currentMins >= open && currentMins <= close;
  }

  return false;
}
