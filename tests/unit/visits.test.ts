import { describe, expect, it } from "vitest";
import { countable, normalizePath, omanDay } from "@/features/analytics/visits";

/**
 * قواعد العدّ. الرقم الذي يراه الأخصائي يجب أن يعني «طلاباً زاروا»،
 * لا عناكب فهرسة ولا جلباً مسبقاً من المتصفّح ولا صفحات الإدارة.
 */

const base = { ip: "1.2.3.4", userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120" };

describe("تسوية المسار", () => {
  it("يُسقط معاملات البحث والمرساة", () => {
    expect(normalizePath("/guide?field=الصحة#top")).toBe("/guide");
  });

  it("يوحّد الجذر والشَّرطة الأخيرة", () => {
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("/library/")).toBe("/library");
    expect(normalizePath("")).toBe("/");
  });
});

describe("ما يُحسب زيارة", () => {
  it("زيارة طالب من متصفّح حقيقي تُحسب", () => {
    expect(countable({ ...base, path: "/guide" })).toBe(true);
  });

  it("عناكب الفهرسة لا تُحسب", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "WhatsApp/2.23",
      "curl/8.4.0",
      "UptimeRobot/2.0",
    ]) {
      expect(countable({ ...base, userAgent: ua, path: "/" }), ua).toBe(false);
    }
  });

  it("الجلب المسبق ليس زيارة", () => {
    expect(countable({ ...base, path: "/library", prefetch: true })).toBe(false);
  });

  it("صفحات الإدارة والواجهات لا تدخل إحصاء الزوّار", () => {
    for (const p of ["/admin", "/admin/visits", "/specialist/library", "/login", "/api/health"]) {
      expect(countable({ ...base, path: p }), p).toBe(false);
    }
  });

  it("مسارٌ يبدأ بكلمةٍ تشبه المستثناة يُحسب — /libraries ليس /login", () => {
    expect(countable({ ...base, path: "/library/career-guidance" })).toBe(true);
  });

  it("طلبٌ بلا متصفّح معروف لا يُحسب", () => {
    expect(countable({ ...base, userAgent: "", path: "/" })).toBe(false);
  });
});

describe("اليوم بتوقيت عُمان", () => {
  it("منتصف الليل في مسقط يبدأ يوماً جديداً، لا منتصف الليل بتوقيت غرينتش", () => {
    // 2026-11-05 الساعة 21:00 بتوقيت غرينتش = 2026-11-06 الواحدة فجراً في مسقط
    const day = omanDay(new Date("2026-11-05T21:00:00Z"));
    expect(day.toISOString().slice(0, 10)).toBe("2026-11-06");
  });

  it("قبل منتصف ليل مسقط يبقى اليوم نفسه", () => {
    // 19:00 غرينتش = 23:00 في مسقط من اليوم نفسه
    const day = omanDay(new Date("2026-11-05T19:00:00Z"));
    expect(day.toISOString().slice(0, 10)).toBe("2026-11-05");
  });

  it("التاريخ بلا وقت، فيصلح مفتاحاً ليوم", () => {
    const day = omanDay(new Date("2026-11-05T13:37:42Z"));
    expect(day.toISOString()).toBe("2026-11-05T00:00:00.000Z");
  });
});
