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

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

/** إخفاء وسط رقم الهاتف قبل أي تسجيل. */
export function maskPhone(phone: string): string {
  const clean = phone.replace(/\s+/gu, "");
  if (clean.length < 5) return "****";
  return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
}
