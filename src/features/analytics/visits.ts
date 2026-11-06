// ═══════════════════════════════════════════════════════════════
// إحصاء زوّار المنصة.
//
// يُعدّ الزائر بلا أن يُعرَف: لا عنوان IP محفوظ، ولا كوكي، ولا معرّف
// يدوم بين يوم ويوم. البصمة = تجزئة (العنوان + المتصفّح + ملح اليوم)،
// والملح يُشتقّ من مفتاح الجلسات وتاريخ اليوم فيتبدّل كل ليلة. فلا
// يمكن ربط زيارات اليوم بزيارات غده، ولا استخراج العنوان من البصمة.
//
// والعدّ لا يعطّل الصفحة أبداً: يُستدعى ولا يُنتظر، وأي خطأ يُبتلع.
// صفحةٌ تسقط لأنّ عدّادها فشل خسارةٌ لا تُحتمل مقابل رقمٍ إحصائي.
// ═══════════════════════════════════════════════════════════════
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** متصفّحات الفهرسة والمراقبة — زياراتها ليست زيارات طلاب. */
const BOT =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|preview|monitor|uptime|curl|wget|python-requests|axios|headless|lighthouse|pingdom|semrush|ahrefs|dataprovider|phantomjs|node-fetch/i;

/** مسارات لا تُحسب: الإدارة، وواجهات البيانات، والملفات. */
const SKIP = /^\/(admin|specialist|login|api|_next)(\/|$)/u;

/** اليوم بتوقيت مسقط (+04)، فلا ينقلب العدّاد في منتصف نهارنا. */
export function omanDay(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

/**
 * بصمة الزائر لهذا اليوم وحده.
 * الملح سرٌّ من البيئة مع تاريخ اليوم: بلا الملح لا تُعكَس التجزئة
 * بتجربة عناوين IP المحتملة، وبتبدّله يومياً لا تُتتبّع عبر الأيام.
 */
function fingerprint(ip: string, userAgent: string, day: Date): string {
  const secret = process.env.JWT_SECRET ?? "bawsalati-visits";
  const salt = createHash("sha256")
    .update(`${secret}|${day.toISOString().slice(0, 10)}`)
    .digest("hex");
  return createHash("sha256").update(`${salt}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

/** المسار كما يُحفظ: بلا معاملات بحث ولا شَرطة أخيرة زائدة. */
export function normalizePath(path: string): string {
  const clean = path.split("?")[0].split("#")[0].trim();
  if (!clean || clean === "/") return "/";
  return clean.replace(/\/+$/u, "") || "/";
}

export interface VisitInput {
  path: string;
  ip: string;
  userAgent: string;
  /** جلبٌ مسبق من Next لا زيارةٌ فعلية */
  prefetch?: boolean;
}

/** هل تُحسب هذه الزيارة؟ منطقٌ خالص، يُختبَر وحده. */
export function countable(input: VisitInput): boolean {
  if (input.prefetch) return false;
  if (!input.userAgent || BOT.test(input.userAgent)) return false;
  return !SKIP.test(normalizePath(input.path));
}

/**
 * تسجيل زيارة. تُستدعى بلا انتظار من تخطيط الصفحات العامة.
 * تعيد true إن سُجّلت — للاختبار فقط، ولا يعوّل عليها المتصل.
 */
export async function recordVisit(input: VisitInput): Promise<boolean> {
  if (!countable(input)) return false;

  const day = omanDay();
  const path = normalizePath(input.path);
  const print = fingerprint(input.ip, input.userAgent, day);

  // زائرٌ جديد اليوم؟ الإدراج ينجح مرةً واحدة، فيكون هو المقياس.
  let isNew = false;
  try {
    await prisma.visitorDay.create({ data: { fingerprint: print, day } });
    isNew = true;
  } catch {
    // مفتاحٌ مكرّر: زارنا اليوم من قبل، فتُحسب مشاهدةً لا زائراً
  }

  await prisma.pageView.upsert({
    where: { day_path: { day, path } },
    create: { day, path, views: 1, visitors: isNew ? 1 : 0 },
    update: { views: { increment: 1 }, visitors: isNew ? { increment: 1 } : undefined },
  });

  return true;
}

/** تُستدعى ولا تُنتظر: لا يعطّل العدّادُ صفحةً ولا يُسقطها. */
export function recordVisitSafely(input: VisitInput): void {
  void recordVisit(input).catch(() => {
    /* الإحصاء ليس أهمّ من الصفحة */
  });
}

export interface VisitStats {
  todayVisitors: number;
  todayViews: number;
  weekVisitors: number;
  monthVisitors: number;
  totalVisitors: number;
  totalViews: number;
  /** آخر ثلاثين يوماً للمخطّط */
  daily: { day: string; visitors: number; views: number }[];
  /** أكثر الصفحات زيارة */
  topPages: { path: string; views: number; visitors: number }[];
  since: string | null;
}

function daysAgo(n: number): Date {
  const d = omanDay();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

/** أرقام لوحة الإدارة. */
export async function visitStats(): Promise<VisitStats> {
  const today = omanDay();

  const [totals, todayRow, week, month, daily, top, first] = await Promise.all([
    prisma.pageView.aggregate({ _sum: { views: true, visitors: true } }),
    prisma.pageView.aggregate({ where: { day: today }, _sum: { views: true, visitors: true } }),
    prisma.pageView.aggregate({ where: { day: { gte: daysAgo(6) } }, _sum: { visitors: true } }),
    prisma.pageView.aggregate({ where: { day: { gte: daysAgo(29) } }, _sum: { visitors: true } }),
    prisma.pageView.groupBy({
      by: ["day"],
      where: { day: { gte: daysAgo(29) } },
      _sum: { views: true, visitors: true },
      orderBy: { day: "asc" },
    }),
    prisma.pageView.groupBy({
      by: ["path"],
      _sum: { views: true, visitors: true },
      orderBy: { _sum: { views: "desc" } },
      take: 10,
    }),
    prisma.pageView.findFirst({ orderBy: { day: "asc" }, select: { day: true } }),
  ]);

  return {
    todayVisitors: todayRow._sum.visitors ?? 0,
    todayViews: todayRow._sum.views ?? 0,
    weekVisitors: week._sum.visitors ?? 0,
    monthVisitors: month._sum.visitors ?? 0,
    totalVisitors: totals._sum.visitors ?? 0,
    totalViews: totals._sum.views ?? 0,
    daily: daily.map((d) => ({
      day: d.day.toISOString().slice(0, 10),
      visitors: d._sum.visitors ?? 0,
      views: d._sum.views ?? 0,
    })),
    topPages: top.map((p) => ({
      path: p.path,
      views: p._sum.views ?? 0,
      visitors: p._sum.visitors ?? 0,
    })),
    since: first ? first.day.toISOString().slice(0, 10) : null,
  };
}

/** إجمالي الزوّار وحده — للعدّاد الظاهر في تذييل الموقع. */
export async function totalVisitors(): Promise<number> {
  const total = await prisma.pageView.aggregate({ _sum: { visitors: true } });
  return total._sum.visitors ?? 0;
}

/**
 * حذف البصمات التي تجاوزت أسبوعين. الأعداد محفوظة في page_views،
 * والبصمة لا تلزم بعد انقضاء يومها — فلا تُستبقى بلا حاجة.
 */
export async function pruneFingerprints(): Promise<number> {
  const { count } = await prisma.visitorDay.deleteMany({ where: { day: { lt: daysAgo(14) } } });
  return count;
}
