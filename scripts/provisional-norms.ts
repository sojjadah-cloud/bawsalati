/**
 * جدول تحويل مؤقّت لتجربة المسار كاملاً قبل توفّر الجداول المعيارية الرسمية.
 *
 *   npm run norms:provisional
 *
 * ⚠️ القيم هنا **ليست** معياريّة ولا مأخوذة من دليل الطالب.
 * هي تحويل خطّي معلن: الرتبة = الدرجة الخام × 11، فتصبح 0 عند صفر و99 عند تسعة،
 * وهي نفسها لكل الصفوف والنوعين. اختير التحويل الخطّي عمداً لأنه شفّاف ولا يوهم
 * بأنه بيانات معيارية.
 *
 * مجموعة القواعد تُوسم provisional، فتظهر تحذيرات ظاهرة على كل نتيجة تُحسب بها،
 * في صفحة الطالب ولوحة الأخصائي ولوحة المدير.
 *
 * عند توفّر الجداول الرسمية:
 *   npm run norms:import -- prisma/seed-data/norms.csv
 * فيُنشأ إصدار جديد غير مؤقّت ويُعطَّل هذا تلقائياً.
 */
import "dotenv/config";
import { PrismaClient, type Gender } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const GRADES = ["9", "10", "11", "12"];
const GENDERS: Gender[] = ["MALE", "FEMALE"];
const MAX_RAW = 9;

/** تحويل خطّي معلن — لا يدّعي أنه توزيع معياري. */
function provisionalPercentile(rawScore: number): number {
  return Math.round((rawScore / MAX_RAW) * 99);
}

async function main() {
  const assessment = await prisma.assessment.findFirst({
    where: { active: true },
    select: { id: true, title: true },
  });
  if (!assessment) throw new Error("لا يوجد مقياس فعّال. شغّل npm run seed أولاً.");

  const dimensions = await prisma.assessmentDimension.findMany({
    where: { assessmentId: assessment.id },
    select: { id: true, code: true },
  });
  if (dimensions.length === 0) throw new Error("لا توجد بيئات معرّفة للمقياس.");

  const latest = await prisma.scoringRuleSet.findFirst({
    where: { assessmentId: assessment.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  await prisma.$transaction(async (tx) => {
    await tx.scoringRuleSet.updateMany({
      where: { assessmentId: assessment.id, active: true },
      data: { active: false },
    });

    await tx.scoringRuleSet.create({
      data: {
        assessmentId: assessment.id,
        version,
        method: "COUNT_PREFERRED_THEN_PERCENTILE",
        notes:
          "جدول مؤقّت للتجربة: تحويل خطّي (الدرجة ÷ 9 × 99)، موحّد لكل الصفوف والنوعين. " +
          "ليس الجدول المعياري الرسمي، ولا يصلح لاعتماد نتيجة طالب.",
        active: true,
        provisional: true,
        rules: {
          create: dimensions.flatMap((d) =>
            GRADES.flatMap((gradeBand) =>
              GENDERS.flatMap((gender) =>
                Array.from({ length: MAX_RAW + 1 }, (_, rawScore) => ({
                  dimensionId: d.id,
                  gradeBand,
                  gender,
                  rawScore,
                  percentile: provisionalPercentile(rawScore),
                }))
              )
            )
          ),
        },
      },
    });
  });

  const count = dimensions.length * GRADES.length * GENDERS.length * (MAX_RAW + 1);
  console.log(`✅ فُعّل جدول مؤقّت (إصدار ${version}) بـ ${count} قاعدة للمقياس «${assessment.title}».`);
  console.log("⚠️  القيم ليست معيارية. كل نتيجة تُحسب به تظهر مصحوبة بتحذير.");
  console.log("   لاستبداله: npm run norms:import -- prisma/seed-data/norms.csv");
}

main()
  .catch((e) => {
    console.error("❌ فشل الإنشاء:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
