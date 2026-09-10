/**
 * حذف نسخة المقياس القديمة التي سبقت اعتماد المنهجية الرسمية.
 *
 *   npx tsx scripts/cleanup-legacy-assessment.ts
 *
 * يرفض الحذف إذا كانت أي جلسة طالب مرتبطة بالنسخة، فلا تُفقد نتيجة.
 * آمن عند التكرار: لا يفعل شيئاً إن لم تبقَ نسخ قديمة.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const stale = await prisma.assessment.findMany({
    where: { active: false },
    select: {
      id: true,
      title: true,
      _count: { select: { sessions: true, groups: true, dimensions: true } },
    },
  });

  if (stale.length === 0) {
    console.log("لا توجد نسخ قديمة.");
    return;
  }

  for (const a of stale) {
    if (a._count.sessions > 0) {
      console.log(`تخطّي «${a.title}»: مرتبطة بـ ${a._count.sessions} جلسة، فلا تُحذف.`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.scoringRuleSet.deleteMany({ where: { assessmentId: a.id } });
      await tx.assessment.delete({ where: { id: a.id } });
    });

    console.log(`حُذفت «${a.title}» بمجموعاتها (${a._count.groups}) وبيئاتها (${a._count.dimensions}).`);
  }

  const left = await prisma.assessment.count();
  const questions = await prisma.assessmentQuestion.count();
  console.log(`المتبقّي: ${left} مقياساً، ${questions} عبارة.`);
}

main()
  .catch((e) => {
    console.error("فشل التنظيف:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
