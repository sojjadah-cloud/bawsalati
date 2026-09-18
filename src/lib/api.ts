// أدوات مشتركة لمعالجات المسارات: استجابات JSON، حرّاس الصلاحيات، معالجة الأخطاء.
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { Prisma } from "@prisma/client";
import { getSession } from "./auth";
import type { Role, SessionUser } from "./jwt";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers });
}

export function noStore(data: unknown, status = 200) {
  return json(data, status, { "Cache-Control": "no-store" });
}

/**
 * تحويل أي خطأ إلى استجابة موحّدة.
 * لا تُسرَّب رسائل الأخطاء الداخلية ولا آثار المكدّس إلى العميل.
 */
export function errorResponse(err: unknown) {
  if (err instanceof ApiError) return json({ error: err.message }, err.status);

  // أخطاء التخزين تحمل حالتها، ولا تُستورد هنا كي لا يجرّ التخزين طبقة الواجهة
  if (err instanceof Error && err.name === "UploadError" && "status" in err) {
    return json({ error: err.message }, Number(err.status));
  }

  if (err instanceof ZodError) {
    return json(
      { error: "بيانات غير صحيحة", issues: err.flatten().fieldErrors },
      422
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return json({ error: "السجل غير موجود" }, 404);
    if (err.code === "P2002") {
      return json({ error: "هذه القيمة مسجّلة مسبقاً" }, 409);
    }
    if (err.code === "P2003") {
      return json({ error: "لا يمكن تنفيذ العملية لارتباط السجل بسجلات أخرى" }, 409);
    }
  }

  // محوّل قاعدة البيانات قد يمرّر خطأ PostgreSQL خاماً بدل رمز Prisma،
  // خاصةً في انتهاكات RESTRICT (23001) التي لا تُترجم إلى P2003.
  const pgCode = postgresCodeOf(err);
  if (pgCode === "23505") return json({ error: "هذه القيمة مسجّلة مسبقاً" }, 409);
  if (pgCode === "23503" || pgCode === "23001") {
    return json({ error: "لا يمكن تنفيذ العملية لارتباط السجل بسجلات أخرى" }, 409);
  }

  console.error("[api]", err instanceof Error ? err.message : err);
  return json({ error: "حدث خطأ في الخادم" }, 500);
}

/** يستخرج رمز خطأ PostgreSQL من خطأ المحوّل إن وُجد. */
function postgresCodeOf(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    const code = (cause as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  const direct = (err as { code?: unknown }).code;
  return typeof direct === "string" && /^\d{5}$/u.test(direct) ? direct : null;
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new ApiError("يجب تسجيل الدخول", 401);
  return session;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) {
    throw new ApiError("ليست لديك صلاحية لهذه العملية", 403);
  }
  return session;
}

export const requireAdmin = () => requireRole(["ADMIN"]);
export const requireStaff = () => requireRole(["ADMIN", "SPECIALIST"]);

/** المختص الذي يملك ملفاً؛ المدير يمرّ بلا specialistId. */
export async function requireSpecialist(): Promise<SessionUser & { specialistId: string }> {
  const session = await requireRole(["SPECIALIST"]);
  if (!session.specialistId) throw new ApiError("حساب المختص غير مكتمل", 403);
  return session as SessionUser & { specialistId: string };
}

/**
 * التحقق من مصدر الطلب المُغيِّر للحالة.
 * طبقة ثانية فوق كوكي SameSite=Strict، تحمي المتصفحات القديمة.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // طلبات غير متصفّحية (curl/اختبارات) لا ترسل Origin
  const host = req.headers.get("host");
  try {
    if (new URL(origin).host !== host) {
      throw new ApiError("طلب من مصدر غير موثوق", 403);
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("طلب من مصدر غير موثوق", 403);
  }
}

export async function parseBody<T>(
  req: Request,
  schema: ZodType<T, ZodTypeDef, unknown>
): Promise<T> {
  assertSameOrigin(req);
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("صيغة الطلب غير صحيحة", 400);
  }
  return schema.parse(raw);
}

/** ترقيم صفحات موحّد لكل القوائم. */
export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
}

export function pageParams(url: URL, defaultSize = 20, maxSize = 100): PageParams {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const requested = Number(url.searchParams.get("pageSize") ?? defaultSize) || defaultSize;
  const pageSize = Math.min(maxSize, Math.max(1, requested));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function paged<T>(items: T[], total: number, p: PageParams) {
  return {
    items,
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}
