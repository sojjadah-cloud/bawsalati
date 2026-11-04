import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * العنوان العام تُبنى عليه خريطة الموقع والروابط المعيارية. وقد نُشرت
 * المنصة مرّةً بعنوان خدمةٍ محذوفة (bawsalati-1.onrender.com) فصارت
 * خريطة الموقع تدلّ محرّكات البحث على عناوين لا تفتح. هذه الاختبارات
 * تثبّت القاعدة: لا يخرج إلى الفهرسة إلا الدومين الرسمي.
 */

const load = async () => {
  vi.resetModules();
  return import("@/lib/app-url");
};

const ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ENV };
});

describe("العنوان العام للتطبيق", () => {
  it("APP_URL هو الكلمة الأخيرة", async () => {
    process.env.APP_URL = "https://example.om/";
    const { appUrl } = await load();
    expect(appUrl()).toBe("https://example.om");
  });

  it("يضيف البروتوكول إن نقص ويحذف الشَّرطة الأخيرة", async () => {
    process.env.APP_URL = "bawsalati.com/";
    const { appUrl } = await load();
    expect(appUrl()).toBe("https://bawsalati.com");
  });

  it("نشرٌ حقيقي بلا APP_URL يقع على الدومين الرسمي لا على عنوان المستضيف", async () => {
    delete process.env.APP_URL;
    delete process.env.RENDER_SERVICE_TYPE;
    process.env.RENDER_EXTERNAL_URL = "https://bawsalati-1.onrender.com";
    const { appUrl, CANONICAL_URL } = await load();
    expect(appUrl()).toBe(CANONICAL_URL);
    expect(appUrl()).not.toContain("onrender.com");
  });

  it("المعاينة المؤقّتة تحتفظ بعنوانها فلا تُنسب صفحاتها إلى الدومين", async () => {
    delete process.env.APP_URL;
    process.env.RENDER_SERVICE_TYPE = "preview";
    process.env.RENDER_EXTERNAL_URL = "https://pr-7-bawsalati.onrender.com";
    const { appUrl } = await load();
    expect(appUrl()).toBe("https://pr-7-bawsalati.onrender.com");
  });

  it("بلا أي عنوان من المنصة فهو تشغيلٌ محلي", async () => {
    delete process.env.APP_URL;
    delete process.env.RENDER_EXTERNAL_URL;
    delete process.env.RENDER_SERVICE_TYPE;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    const { appUrl } = await load();
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("الدومين الرسمي بلا شَرطةٍ أخيرة، فلا تنشأ روابط بشَرطتين", async () => {
    const { CANONICAL_URL } = await load();
    expect(CANONICAL_URL).toBe("https://www.bawsalati.com");
    expect(CANONICAL_URL.endsWith("/")).toBe(false);
  });
});
