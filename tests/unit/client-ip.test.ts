import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * تحديد المعدّل يعتمد على عنوان العميل، فلو أخذناه من أقصى يسار
 * X-Forwarded-For أمكن لأي مهاجم تدوير الترويسة وتجاوز الحدّ.
 * هذه الاختبارات تثبّت السلوك الصحيح: لا تُقرأ الترويسة إلا خلف وسيط موثوق،
 * وتُقرأ من اليمين بعدد الوسطاء.
 */
const ORIGINAL = { ...process.env };

async function clientIpWith(env: Record<string, string | undefined>, headers: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.resetModules();
  const { clientIp } = await import("@/lib/audit");
  return clientIp(new Request("http://localhost/api/ask", { headers }));
}

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
});

describe("عنوان العميل خلف الوسطاء", () => {
  it("يتجاهل الترويسة حين لا يوجد وسيط موثوق", async () => {
    const ip = await clientIpWith(
      { TRUSTED_PROXY_HOPS: "0" },
      { "x-forwarded-for": "203.0.113.9", "x-real-ip": "203.0.113.9" }
    );
    expect(ip).toBe("local");
  });

  it("يأخذ العنوان الذي كتبه الوسيط لا ما أرسله العميل", async () => {
    const ip = await clientIpWith(
      { TRUSTED_PROXY_HOPS: "1" },
      { "x-forwarded-for": "1.1.1.1, 198.51.100.7" }
    );
    expect(ip).toBe("198.51.100.7");
  });

  it("يقرأ العنوان الوحيد حين لا يزوّر العميل شيئاً", async () => {
    const ip = await clientIpWith({ TRUSTED_PROXY_HOPS: "1" }, { "x-forwarded-for": "198.51.100.7" });
    expect(ip).toBe("198.51.100.7");
  });

  it("يحترم أكثر من وسيط موثوق", async () => {
    const ip = await clientIpWith(
      { TRUSTED_PROXY_HOPS: "2" },
      { "x-forwarded-for": "1.1.1.1, 198.51.100.7, 10.0.0.5" }
    );
    expect(ip).toBe("198.51.100.7");
  });

  it("تزوير الترويسة لا يغيّر مفتاح الحدّ حين لا وسيط", async () => {
    const a = await clientIpWith({ TRUSTED_PROXY_HOPS: "0" }, { "x-forwarded-for": "203.0.113.1" });
    const b = await clientIpWith({ TRUSTED_PROXY_HOPS: "0" }, { "x-forwarded-for": "203.0.113.2" });
    expect(a).toBe(b);
  });
});
