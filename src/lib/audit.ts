// سجل تدقيق غير قابل للتعديل. فشل الكتابة لا يُفشل الطلب الأصلي.
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "./jwt";

export interface AuditOpts {
  actor?: SessionUser | null;
  entityId?: string;
  /** بيانات وصفية فقط — ممنوع تمرير إجابات أو أرقام هواتف أو كلمات مرور. */
  meta?: Record<string, unknown>;
  ip?: string | null;
}

export async function audit(action: string, entity: string, opts: AuditOpts = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: opts.entityId ?? null,
        actorId: opts.actor?.id ?? null,
        actorName: opts.actor?.name ?? null,
        meta: opts.meta === undefined ? Prisma.JsonNull : (opts.meta as Prisma.InputJsonValue),
        ip: opts.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] تعذّر تسجيل العملية:", e instanceof Error ? e.message : e);
  }
}

/**
 * عدد الوسطاء الموثوقين أمام التطبيق.
 * ترويسة X-Forwarded-For يكتبها العميل ويُلحق بها كل وسيط عنوان من استقبل منه،
 * فأقصى اليسار قيمة يتحكّم بها المهاجم. القيمة الموثوقة هي التي كتبها آخر وسيط
 * لنا، أي الترتيب من اليمين بعدد الوسطاء. صفر يعني لا وسيط، فتُتجاهل الترويسة
 * كلياً وإلا أمكن تجاوز حدود المعدّل بترويسة مزوّرة.
 */
function trustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS;
  if (raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0) return n;
  }
  // على منصات الاستضافة يقف موازن حِمل واحد أمام التطبيق افتراضياً.
  return process.env.NODE_ENV === "production" ? 1 : 0;
}

export function clientIp(req: Request): string {
  const hops = trustedProxyHops();
  if (hops > 0) {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) {
      const parts = fwd
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      // العنوان الذي كتبه أول وسيط موثوق لنا، لا ما أرسله العميل
      const ip = parts[parts.length - hops];
      if (ip) return ip;
      if (parts.length > 0) return parts[0];
    }
    const real = req.headers.get("x-real-ip");
    if (real) return real.trim();
  }
  return "local";
}

/** إخفاء وسط رقم الهاتف قبل أي تسجيل. */
export function maskPhone(phone: string): string {
  const clean = phone.replace(/\s+/gu, "");
  if (clean.length < 5) return "****";
  return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
}
