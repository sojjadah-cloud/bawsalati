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
  let error: string | undefined;

  if (checkDb) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = "up";
    } catch (e) {
      db = "down";
      error = e instanceof Error ? e.message.split("\n")[0].slice(0, 200) : "خطأ غير معروف";
    }
  }

  return new Response(
    JSON.stringify({ ok: true, db, at: new Date().toISOString(), ...(error ? { error } : {}) }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}
