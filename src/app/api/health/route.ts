/**
 * فحص حياة الخدمة.
 *
 * بلا وسائط: لا يلمس قاعدة البيانات ولا يقرأ جلسة، فهو أرخص مسار يوقظ الخدمة
 * على خطة Render المجانية التي تُنيم الخادم بعد ربع ساعة من السكون، ويُنادى
 * من خدمة فحص خارجية كل عشر دقائق ليبقى الموقع مستيقظاً.
 *
 * مع ‎?db=1: يسأل قاعدة البيانات سؤالاً واحداً. الخادم قد يكون حيّاً وقاعدته
 * بعيدة — انتهاء صلاحية قاعدة الخطة المجانية مثلاً — فتصير كل صفحة تعتمد
 * عليها خطأً بينما يقول الفحص إنّ كل شيء بخير. يبقى الردّ 200 في الحالتين
 * كي لا تُعيد Render تشغيل خدمةٍ سليمة، والحالة في الحقل `db`.
 */
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const checkDb = new URL(req.url).searchParams.has("db");

  let db: "up" | "down" | "skipped" = "skipped";
  let detail: Record<string, string> = {};

  if (checkDb) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = "up";
    } catch (e) {
      db = "down";
      // رسالة الخطأ قد تأتي فارغة، ورمز Prisma وحده يكفي للتشخيص:
      // P1001 القاعدة بعيدة · P1000 بيانات دخول خاطئة · P1017 أغلقت الاتصال
      const err = e as { message?: string; name?: string; code?: string };
      detail = {
        code: err.code ?? "",
        name: err.name ?? "",
        error: (err.message ?? "").split("\n")[0].slice(0, 200),
      };
      for (const key of Object.keys(detail)) if (!detail[key]) delete detail[key];
    }
  }

  return new Response(
    JSON.stringify({ ok: true, db, at: new Date().toISOString(), ...detail }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}
