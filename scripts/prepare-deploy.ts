/**
 * تهيئة البيانات قبل البناء.
 *
 *   npm run deploy:data
 *
 * يجمع خطوات النشر التي تحتاج قاعدة البيانات: الترحيلات، ثم التهيئة، ثم
 * إدخال الجداول المعيارية ودليل الطالب والكتب والبرامج وبنك الأسئلة.
 *
 * ولماذا سكربت بدل سلسلة أوامر في render.yaml؟ لأن القاعدة قد تكون بعيدة —
 * انتهاء صلاحية قاعدة الخطة المجانية مثلاً — فتفشل أول خطوة ويتوقّف البناء
 * كلّه، فلا يصل إلى الموقع أي تحديث: ولا حتى التحديث الذي يشخّص العطل.
 *
 * فإن تعذّر الوصول إلى القاعدة يُحذَّر بوضوح ويُكمَل البناء، فينشر التطبيق
 * ويعرض صفحة «تعذّر تحميل البيانات» بدل أن يبقى الموقع على بناءٍ قديم لا
 * يمكن إصلاحه. وأي خطأ آخر — ترحيل فاشل، ملف ناقص — يوقف البناء كما يجب.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const STEPS: [string, string][] = [
  ["الترحيلات", "npx prisma migrate deploy"],
  ["التهيئة", "npm run seed"],
  ["الجداول المعيارية", "npm run norms:import -- prisma/seed-data/norms.csv"],
  ["الأخصائيون وبنك الأسئلة", "npm run seed:content"],
  ["دليل الطالب", 'npm run guide:import content/StudentGuide2026.pdf "دليل الطالب 2026"'],
  ["كتب المكتبة", "npm run library:import"],
  ["تنظيف ما لا يُفتح", "npm run library:prune -- --apply"],
  ["دليل التخصصات", "npm run programs:import"],
  ["أسئلة الدليل", "npm run faq:guide"],
];

/** رسالة الخطأ قد تأتي فارغة، فلا يُستدلّ على الوصول بوجود نصٍّ فيها. */
async function databaseReachable(): Promise<{ ok: boolean; reason: string }> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, reason: "" };
  } catch (e) {
    const message = e instanceof Error ? e.message.split("\n")[0].trim() : String(e);
    const name = e instanceof Error ? e.name : "";
    return { ok: false, reason: message || name || "تعذّر الاتصال بلا رسالة" };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function main() {
  const { ok, reason } = await databaseReachable();

  if (!ok) {
    console.warn(
      [
        "",
        "⚠️  تعذّر الوصول إلى قاعدة البيانات، فتُخطّى خطوات البيانات ويُكمَل البناء.",
        `    السبب: ${reason}`,
        "",
        "    الموقع سيُنشر وسيعرض «تعذّر تحميل هذه الصفحة» في كل صفحة تقرأ منها،",
        "    وتظهر حالة القاعدة في ‎/api/health?db=1. أصلح القاعدة ثم أعد النشر.",
        "",
      ].join("\n")
    );
    return;
  }

  for (const [name, command] of STEPS) {
    console.log(`\n▶ ${name}`);
    execSync(command, { stdio: "inherit" });
  }

  console.log("\n✅ اكتملت تهيئة البيانات.\n");
}

main().catch((e) => {
  console.error("❌ فشلت تهيئة البيانات:", e instanceof Error ? e.message : e);
  process.exit(1);
});
