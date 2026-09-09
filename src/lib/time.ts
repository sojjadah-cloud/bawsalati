// أدوات الوقت والتاريخ. كل الحسابات بالتوقيت المحلي لسلطنة عُمان (UTC+4، بلا توقيت صيفي).
export const TIMEZONE = "Asia/Muscat";
export const TZ_OFFSET_MINUTES = 4 * 60;

/** "HH:mm" → دقائق منذ منتصف الليل. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** دقائق منذ منتصف الليل → "HH:mm". */
export function toHhMm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidHhMm(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/u.test(value);
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** "YYYY-MM-DD" → قيمة DATE في قاعدة البيانات (منتصف ليل UTC، بلا انزلاق يوم). */
export function isoDateToUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function utcToIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** يوم الأسبوع: 0 = الأحد … 6 = السبت. */
export function weekdayOf(isoDate: string): number {
  return isoDateToUtc(isoDate).getUTCDay();
}

/** تاريخ اليوم في عُمان بصيغة ISO. */
export function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() + TZ_OFFSET_MINUTES * 60_000);
  return local.toISOString().slice(0, 10);
}

/** الوقت الحالي في عُمان بالدقائق منذ منتصف الليل. */
export function nowMinutes(): number {
  const now = new Date();
  const local = new Date(now.getTime() + TZ_OFFSET_MINUTES * 60_000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = isoDateToUtc(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return utcToIsoDate(d);
}

export const WEEKDAY_LABELS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/** "2026-09-13" → "الأحد 13 سبتمبر 2026". */
export function formatArabicDate(isoDate: string): string {
  if (!isValidIsoDate(isoDate)) return isoDate;
  const d = isoDateToUtc(isoDate);
  return `${WEEKDAY_LABELS[d.getUTCDay()]} ${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "13:30" → "01:30 م". */
export function formatArabicTime(hhmm: string): string {
  if (!isValidHhMm(hhmm)) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "ص" : "م";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export interface Slot {
  startTime: string;
  endTime: string;
}

/** تقطيع نافذة دوام إلى فترات متساوية. الفترة الناقصة في آخر النافذة تُهمَل. */
export function buildSlots(startTime: string, endTime: string, slotMinutes: number): Slot[] {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (slotMinutes <= 0 || end <= start) return [];
  const slots: Slot[] = [];
  for (let t = start; t + slotMinutes <= end; t += slotMinutes) {
    slots.push({ startTime: toHhMm(t), endTime: toHhMm(t + slotMinutes) });
  }
  return slots;
}

/** تداخل فترتين زمنيتين. */
export function overlaps(a: Slot, b: { startTime: string; endTime: string }): boolean {
  return toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime);
}
