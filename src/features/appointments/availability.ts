// حساب الفترات المتاحة للمختص.
// الطالب لا يكتب موعداً حرّاً — يختار من فترات يولّدها الخادم فقط.
import { prisma } from "@/lib/prisma";
import {
  addDaysIso,
  buildSlots,
  isoDateToUtc,
  nowMinutes,
  overlaps,
  todayIso,
  toMinutes,
  weekdayOf,
  type Slot,
} from "@/lib/time";

/** أقصى مدى زمني يمكن للطالب الحجز خلاله. */
export const BOOKING_HORIZON_DAYS = 21;

/** الحالات التي تشغل الفترة فعلياً. الملغى يحرّرها. */
const OCCUPYING = ["PENDING", "CONFIRMED", "COMPLETED"] as const;

export interface DayAvailability {
  date: string;
  weekday: number;
  slots: Slot[];
}

interface AvailabilityWindow {
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}

interface BlockedPeriod {
  date: string;
  fullDay: boolean;
  startTime: string | null;
  endTime: string | null;
}

/** كل الفترات الحرّة للمختص خلال المدى المسموح، مرتّبة بالتاريخ. */
export async function getAvailability(
  specialistId: string,
  options: { fromDate?: string; days?: number } = {}
): Promise<DayAvailability[]> {
  const from = options.fromDate ?? todayIso();
  const days = Math.min(options.days ?? BOOKING_HORIZON_DAYS, 60);
  const to = addDaysIso(from, days - 1);

  const specialist = await prisma.specialistProfile.findFirst({
    where: { id: specialistId, bookable: true, user: { active: true } },
    select: { id: true },
  });
  if (!specialist) return [];

  const [windows, blocked, taken] = await Promise.all([
    prisma.specialistAvailability.findMany({
      where: { specialistId, active: true },
      select: { weekday: true, startTime: true, endTime: true, slotMinutes: true },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    }),
    prisma.specialistBlockedDate.findMany({
      where: {
        specialistId,
        date: { gte: isoDateToUtc(from), lte: isoDateToUtc(to) },
      },
      select: { date: true, fullDay: true, startTime: true, endTime: true },
    }),
    prisma.appointment.findMany({
      where: {
        specialistId,
        scheduledDate: { gte: isoDateToUtc(from), lte: isoDateToUtc(to) },
        status: { in: [...OCCUPYING] },
      },
      select: { scheduledDate: true, startTime: true, endTime: true },
    }),
  ]);

  if (windows.length === 0) return [];

  const blockedByDate = groupBlocked(blocked);
  const takenByDate = new Map<string, Set<string>>();
  for (const t of taken) {
    const key = t.scheduledDate.toISOString().slice(0, 10);
    const set = takenByDate.get(key) ?? new Set<string>();
    set.add(t.startTime);
    takenByDate.set(key, set);
  }

  const today = todayIso();
  const currentMinutes = nowMinutes();
  const result: DayAvailability[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDaysIso(from, i);
    if (date < today) continue;

    const weekday = weekdayOf(date);
    const dayWindows = windows.filter((w) => w.weekday === weekday);
    if (dayWindows.length === 0) continue;

    const dayBlocks = blockedByDate.get(date) ?? [];
    if (dayBlocks.some((b) => b.fullDay)) continue;

    const slots = freeSlotsForDay({
      windows: dayWindows,
      blocks: dayBlocks,
      takenStarts: takenByDate.get(date) ?? new Set<string>(),
      // لا تُعرض فترة بدأت أو مضت اليوم
      minStartMinutes: date === today ? currentMinutes : -1,
    });

    if (slots.length > 0) result.push({ date, weekday, slots });
  }

  return result;
}

function groupBlocked(rows: BlockedRow[]): Map<string, BlockedPeriod[]> {
  const map = new Map<string, BlockedPeriod[]>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    const list = map.get(key) ?? [];
    list.push({
      date: key,
      fullDay: r.fullDay,
      startTime: r.startTime,
      endTime: r.endTime,
    });
    map.set(key, list);
  }
  return map;
}

interface BlockedRow {
  date: Date;
  fullDay: boolean;
  startTime: string | null;
  endTime: string | null;
}

function freeSlotsForDay(input: {
  windows: AvailabilityWindow[];
  blocks: BlockedPeriod[];
  takenStarts: Set<string>;
  minStartMinutes: number;
}): Slot[] {
  const all: Slot[] = [];
  for (const w of input.windows) {
    all.push(...buildSlots(w.startTime, w.endTime, w.slotMinutes));
  }

  const seen = new Set<string>();
  const unique = all.filter((s) => {
    if (seen.has(s.startTime)) return false;
    seen.add(s.startTime);
    return true;
  });

  const partialBlocks = input.blocks.filter(
    (b) => !b.fullDay && b.startTime && b.endTime
  );

  return unique
    .filter((slot) => toMinutes(slot.startTime) > input.minStartMinutes)
    .filter((slot) => !input.takenStarts.has(slot.startTime))
    .filter(
      (slot) =>
        !partialBlocks.some((b) =>
          overlaps(slot, { startTime: b.startTime as string, endTime: b.endTime as string })
        )
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** تحقّق نهائي قبل الحجز: هل الفترة المطلوبة ما زالت معروضة فعلاً؟ */
export async function isSlotOffered(
  specialistId: string,
  date: string,
  startTime: string
): Promise<Slot | null> {
  const availability = await getAvailability(specialistId, { fromDate: date, days: 1 });
  const day = availability.find((d) => d.date === date);
  return day?.slots.find((s) => s.startTime === startTime) ?? null;
}
