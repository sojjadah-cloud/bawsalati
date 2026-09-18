import { describe, expect, it } from "vitest";
import { composeBookingSummary, internationalPhone } from "@/lib/notifications";

describe("ملخّص الحجز للإدارة", () => {
  const base = {
    appointmentId: "a1",
    studentName: "محمد علي",
    grade: "الصف العاشر",
    studentPhone: "91234567",
    specialistName: "محمود الدباني",
    date: "الأحد 20 سبتمبر 2026",
    time: "08:00 ص",
    topic: "مهارات الدراسة",
    details: null,
  };

  it("يحمل تفاصيل الحجز كلها", () => {
    const text = composeBookingSummary(base);
    for (const value of Object.values(base).slice(1, -1)) {
      expect(text).toContain(value as string);
    }
    expect(text).not.toContain("التفاصيل:");
  });

  it("يضيف تفاصيل الاستشارة حين تُكتب", () => {
    expect(composeBookingSummary({ ...base, details: "قلق الامتحانات" })).toContain(
      "التفاصيل: قلق الامتحانات"
    );
  });

  it("يكمل الرقم العُماني برمز الدولة", () => {
    expect(internationalPhone("94996269")).toBe("96894996269");
    expect(internationalPhone("96894996269")).toBe("96894996269");
  });
});
