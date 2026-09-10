import { describe, expect, it } from "vitest";
import { startSessionSchema, phoneSchema, studentNameSchema } from "@/features/assessment/schemas";
import { createAppointmentSchema, availabilitySchema } from "@/features/appointments/schemas";
import { resourceSchema } from "@/features/library/schemas";

describe("بيانات الطالب", () => {
  it("يقبل رقماً عُمانياً صحيحاً", () => {
    expect(phoneSchema.safeParse("92112233").success).toBe(true);
    expect(phoneSchema.safeParse("79112233").success).toBe(true);
  });

  it("يرفض الأرقام غير الصحيحة", () => {
    expect(phoneSchema.safeParse("12112233").success).toBe(false); // بادئة خاطئة
    expect(phoneSchema.safeParse("9211223").success).toBe(false); // قصير
    expect(phoneSchema.safeParse("921122334").success).toBe(false); // طويل
    expect(phoneSchema.safeParse("9211-2233").success).toBe(false);
  });

  it("يقبل الأسماء العربية ويرفض الرموز", () => {
    expect(studentNameSchema.safeParse("سالم بن ناصر الكندي").success).toBe(true);
    expect(studentNameSchema.safeParse("Ali Al-Hinai").success).toBe(true);
    expect(studentNameSchema.safeParse("<script>").success).toBe(false);
    expect(studentNameSchema.safeParse("سا").success).toBe(false);
  });

  it("يشترط الموافقة على إشعار الخصوصية والنوع", () => {
    const valid = {
      studentName: "سالم بن ناصر الكندي",
      grade: "11",
      gender: "MALE",
      phone: "92112233",
      consent: true,
    };
    expect(startSessionSchema.safeParse(valid).success).toBe(true);
    expect(startSessionSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(startSessionSchema.safeParse({ ...valid, gender: "OTHER" }).success).toBe(false);
  });

  it("يقبل الصفوف المدعومة فقط", () => {
    const base = {
      studentName: "سالم الكندي",
      gender: "MALE" as const,
      phone: "92112233",
      consent: true as const,
    };
    expect(startSessionSchema.safeParse({ ...base, grade: "12" }).success).toBe(true);
    expect(startSessionSchema.safeParse({ ...base, grade: "9" }).success).toBe(true);
    expect(startSessionSchema.safeParse({ ...base, grade: "8" }).success).toBe(false);
  });
});

describe("حجز الموعد", () => {
  const valid = {
    specialistId: "spec-1",
    studentName: "خالد بن سعيد الرواحي",
    grade: "12",
    phone: "99887766",
    date: "2026-09-10",
    startTime: "08:00",
    topicId: "topic-1",
    topicDetails: "",
    consent: true as const,
  };

  it("يقبل حجزاً مكتملاً", () => {
    expect(createAppointmentSchema.safeParse(valid).success).toBe(true);
  });

  it("يرفض تاريخاً أو وقتاً غير صالح", () => {
    expect(createAppointmentSchema.safeParse({ ...valid, date: "2026-13-40" }).success).toBe(false);
    expect(createAppointmentSchema.safeParse({ ...valid, startTime: "8:00" }).success).toBe(false);
  });

  it("يرفض الحقول غير المعروفة", () => {
    expect(
      createAppointmentSchema.safeParse({ ...valid, status: "CONFIRMED" }).success
    ).toBe(false);
  });

  it("يرفض نافذة دوام تنتهي قبل بدايتها", () => {
    expect(
      availabilitySchema.safeParse({
        weekday: 1,
        startTime: "12:00",
        endTime: "08:00",
        slotMinutes: 30,
      }).success
    ).toBe(false);
  });
});

describe("موارد المكتبة", () => {
  const base = {
    categoryId: "cat-1",
    title: "كتاب تجريبي",
    type: "READABLE" as const,
  };

  it("يشترط ملفاً أو رابطاً للمورد المقروء", () => {
    expect(resourceSchema.safeParse(base).success).toBe(false);
    expect(resourceSchema.safeParse({ ...base, fileId: "file-1" }).success).toBe(true);
  });

  it("يشترط ملفاً صوتياً للكتاب المسموع", () => {
    expect(resourceSchema.safeParse({ ...base, type: "AUDIO" }).success).toBe(false);
    expect(
      resourceSchema.safeParse({ ...base, type: "AUDIO", audioFileId: "audio-1" }).success
    ).toBe(true);
  });

  it("يرفض الروابط غير الآمنة", () => {
    expect(
      resourceSchema.safeParse({ ...base, type: "LINK", externalUrl: "http://x.com" }).success
    ).toBe(false);
    expect(
      resourceSchema.safeParse({ ...base, type: "LINK", externalUrl: "javascript:alert(1)" }).success
    ).toBe(false);
    expect(
      resourceSchema.safeParse({ ...base, type: "LINK", externalUrl: "https://x.com/a.pdf" }).success
    ).toBe(true);
  });
});
