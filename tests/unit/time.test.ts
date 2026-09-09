import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  buildSlots,
  formatArabicDate,
  formatArabicTime,
  isValidHhMm,
  isValidIsoDate,
  isoDateToUtc,
  overlaps,
  toHhMm,
  toMinutes,
  utcToIsoDate,
  weekdayOf,
} from "@/lib/time";

describe("تحويل الأوقات", () => {
  it("يحوّل بين النص والدقائق", () => {
    expect(toMinutes("08:30")).toBe(510);
    expect(toHhMm(510)).toBe("08:30");
    expect(toHhMm(0)).toBe("00:00");
  });

  it("يتحقق من صيغة الوقت", () => {
    expect(isValidHhMm("00:00")).toBe(true);
    expect(isValidHhMm("23:59")).toBe(true);
    expect(isValidHhMm("24:00")).toBe(false);
    expect(isValidHhMm("8:00")).toBe(false);
  });

  it("يتحقق من صيغة التاريخ", () => {
    expect(isValidIsoDate("2026-09-10")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("10-09-2026")).toBe(false);
  });
});

describe("التواريخ", () => {
  it("يحوّل التاريخ ذهاباً وإياباً بلا انزلاق يوم", () => {
    const iso = "2026-09-10";
    expect(utcToIsoDate(isoDateToUtc(iso))).toBe(iso);
    expect(isoDateToUtc(iso).toISOString()).toBe("2026-09-10T00:00:00.000Z");
  });

  it("يحسب يوم الأسبوع صحيحاً", () => {
    // 2026-09-10 يوافق الخميس (4)
    expect(weekdayOf("2026-09-10")).toBe(4);
    expect(weekdayOf("2026-09-13")).toBe(0); // الأحد
  });

  it("يضيف أياماً عبر حدود الشهر", () => {
    expect(addDaysIso("2026-09-29", 3)).toBe("2026-10-02");
    expect(addDaysIso("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("يصوغ التاريخ والوقت بالعربية", () => {
    expect(formatArabicDate("2026-09-10")).toBe("الخميس 10 سبتمبر 2026");
    expect(formatArabicTime("08:00")).toBe("08:00 ص");
    expect(formatArabicTime("13:30")).toBe("01:30 م");
    expect(formatArabicTime("00:15")).toBe("12:15 ص");
    expect(formatArabicTime("12:05")).toBe("12:05 م");
  });
});

describe("تقسيم فترات الدوام", () => {
  it("يقسّم النافذة إلى فترات متساوية", () => {
    const slots = buildSlots("08:00", "10:00", 30);
    expect(slots).toHaveLength(4);
    expect(slots[0]).toEqual({ startTime: "08:00", endTime: "08:30" });
    expect(slots[3]).toEqual({ startTime: "09:30", endTime: "10:00" });
  });

  it("يهمل الفترة الناقصة في نهاية النافذة", () => {
    const slots = buildSlots("08:00", "09:20", 30);
    expect(slots).toHaveLength(2);
    expect(slots[1].endTime).toBe("09:00");
  });

  it("يعيد قائمة فارغة لنافذة غير صالحة", () => {
    expect(buildSlots("10:00", "08:00", 30)).toEqual([]);
    expect(buildSlots("08:00", "10:00", 0)).toEqual([]);
  });

  it("يكتشف تداخل الفترات", () => {
    const slot = { startTime: "09:00", endTime: "09:30" };
    expect(overlaps(slot, { startTime: "09:15", endTime: "10:00" })).toBe(true);
    expect(overlaps(slot, { startTime: "08:00", endTime: "09:00" })).toBe(false);
    expect(overlaps(slot, { startTime: "09:30", endTime: "10:00" })).toBe(false);
    expect(overlaps(slot, { startTime: "08:00", endTime: "12:00" })).toBe(true);
  });
});
