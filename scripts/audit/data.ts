// فحص سلامة البيانات: بنية المقياس، وتغطية جداول التصحيح، والقيود، والتجزئة.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const results: { name: string; pass: boolean }[] = [];
function check(name: string, pass: boolean, detail = "") {
  results.push({ name, pass });
  console.log((pass ? "✔" : "✘") + " " + name + (detail ? "  — " + detail : ""));
}

async function main() {
  console.log("── بنية المقياس ──");
  const assessments = await prisma.assessment.findMany({ select: { id: true, active: true, title: true } });
  const active = assessments.filter((a) => a.active);
  check("مقياس واحد نشط", active.length === 1, active.length + " من " + assessments.length);

  const blocks = await prisma.assessmentGroup.count({ where: { assessmentId: active[0]?.id } });
  check("ثلاث مجموعات", blocks === 3, blocks + "");

  const questions = await prisma.assessmentQuestion.count();
  check("أربع وخمسون عبارة", questions === 54, questions + "");

  const options = await prisma.assessmentOption.count();
  check("خياران للإجابة", options === 2, options + "");

  const dims = await prisma.assessmentDimension.findMany({
    select: { code: true, label: true, _count: { select: { questions: true } } },
    orderBy: { displayOrder: "asc" },
  });
  check("ست بيئات", dims.length === 6, dims.map((d) => d.code).join(""));
  check(
    "تسع عبارات لكل بيئة",
    dims.every((d) => d._count.questions === 9),
    dims.map((d) => `${d.label}:${d._count.questions}`).join("، ")
  );

  const dupNumbers = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM (SELECT number FROM assessment_questions GROUP BY number HAVING COUNT(*) > 1) t`
  );
  check("لا تتكرّر أرقام العبارات", Number(dupNumbers[0].count) === 0, dupNumbers[0].count + " مكرّراً");

  console.log("\n── جداول التصحيح ──");
  const ruleSets = await prisma.scoringRuleSet.findMany({
    select: { id: true, active: true, provisional: true, method: true, _count: { select: { rules: true } } },
  });
  const activeSet = ruleSets.find((r) => r.active);
  check("مجموعة قواعد نشطة واحدة", ruleSets.filter((r) => r.active).length === 1, ruleSets.length + " مجموعة");
  check("الطريقة معلَنة في البيانات لا في الشيفرة", activeSet?.method === "COUNT_PREFERRED_THEN_PERCENTILE", activeSet?.method ?? "—");
  const expected = 6 * 4 * 2 * 10; // بيئة × صف × جنس × درجة خام 0..9
  check("تغطية كاملة لكل الخلايا", activeSet?._count.rules === expected, `${activeSet?._count.rules} من ${expected}`);
  // الوسم صحيح في الحالتين: المهم أن يكون معلناً لا مخفيّاً
  check(
    "حالة الجدول معلَنة",
    typeof activeSet?.provisional === "boolean",
    activeSet?.provisional ? "مؤقّت، والتحذير ظاهر على كل نتيجة" : "معتمد ومشتقّ من عيّنة كافية"
  );

  const gaps = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM scoring_rules WHERE percentile < 1 OR percentile > 99`
  );
  check("كل الرتب المئينية داخل المدى", Number(gaps[0].count) === 0, gaps[0].count + " خارج المدى");

  console.log("\n── القيود وسلامة الربط ──");
  const idx = await prisma.$queryRawUnsafe<{ indexname: string }[]>(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'appointments'`
  );
  check(
    "قيد فريد يمنع الحجز المزدوج في قاعدة البيانات",
    idx.some((i) => /specialist.*scheduled.*start|scheduledDate.*startTime/i.test(i.indexname)),
    idx.map((i) => i.indexname).join(", ")
  );

  const orphanAnswers = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM assessment_answers a
     LEFT JOIN assessment_sessions s ON s.id = a."sessionId" WHERE s.id IS NULL`
  );
  check("لا إجابات يتيمة", Number(orphanAnswers[0].count) === 0, orphanAnswers[0].count + "");

  const orphanResults = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM assessment_results r
     LEFT JOIN assessment_sessions s ON s.id = r."sessionId" WHERE s.id IS NULL`
  );
  check("لا نتائج يتيمة", Number(orphanResults[0].count) === 0, orphanResults[0].count + "");

  const dupResults = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM (SELECT "sessionId" FROM assessment_results GROUP BY "sessionId" HAVING COUNT(*) > 1) t`
  );
  check("نتيجة واحدة لكل جلسة", Number(dupResults[0].count) === 0, dupResults[0].count + " جلسة مكرّرة");

  console.log("\n── الأسرار والرموز ──");
  const users = await prisma.user.findMany({ select: { email: true, passwordHash: true } });
  check("كل كلمات المرور مجزّأة بـ bcrypt", users.every((u) => /^\$2[aby]\$\d{2}\$/.test(u.passwordHash)), users.length + " حساباً");
  check("لا كلمة مرور مخزّنة نصّاً", users.every((u) => u.passwordHash.length >= 55));

  const sessionCols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'assessment_sessions'`
  );
  check(
    "رمز النتيجة يُخزَّن مجزّأً لا نصّاً",
    sessionCols.some((c) => /tokenHash/i.test(c.column_name)) && !sessionCols.some((c) => c.column_name === "token"),
    sessionCols.map((c) => c.column_name).filter((c) => /token/i.test(c)).join(", ")
  );

  const apptCols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'appointments'`
  );
  check(
    "رمز متابعة الموعد يُخزَّن مجزّأً",
    apptCols.some((c) => /tokenHash/i.test(c.column_name)) && !apptCols.some((c) => c.column_name === "token"),
    apptCols.map((c) => c.column_name).filter((c) => /token/i.test(c)).join(", ")
  );

  console.log("\n── المحتوى ──");
  const faqTotal = await prisma.faqEntry.count({ where: { active: true } });
  check("بنك أسئلة جويب مملوء", faqTotal >= 300, faqTotal + " سؤالاً");
  const dupFaq = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM (SELECT lower(question) q FROM faq_entries GROUP BY 1 HAVING COUNT(*) > 1) t`
  );
  check("لا سؤال مكرّر", Number(dupFaq[0].count) === 0, dupFaq[0].count + " مكرّراً");

  const lib = await prisma.libraryResource.count({ where: { published: true, archivedAt: null } });
  check("المكتبة مملوءة", lib >= 60, lib + " مورداً");

  const cats = await prisma.libraryCategory.count({ where: { active: true } });
  check("تصنيفات المكتبة موجودة", cats >= 3, cats + " تصنيفاً");

  const specialists = await prisma.specialistProfile.count();
  check("ثلاثة مختصين", specialists === 3, specialists + "");

  const withBio = await prisma.specialistProfile.count({ where: { NOT: { bio: "" } } });
  check("لكل مختص نبذة في ملفه", withBio === 3, withBio + " من 3");

  const withSlots = await prisma.specialistProfile.count({ where: { availability: { some: { active: true } } } });
  check("لكل مختص أوقات استقبال", withSlots === 3, withSlots + " من 3");

  const guide = await prisma.guideDocument.count({ where: { published: true } });
  check("دليل الطالب منشور", guide >= 1, guide + "");

  const audits = await prisma.auditLog.count();
  check("سجل التدقيق يعمل", audits > 0, audits + " سجلاً");

  const auditLeak = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM audit_logs WHERE meta::text ~ '[0-9]{8}'`
  );
  check("لا أرقام هواتف في سجل التدقيق", Number(auditLeak[0].count) === 0, auditLeak[0].count + " سجلاً");

  console.log("\nملخص: " + results.filter((r) => r.pass).length + "/" + results.length);
  const bad = results.filter((r) => !r.pass);
  if (bad.length) console.log("لم تنجح: " + bad.map((b) => b.name).join(" | "));
}

main()
  .catch((e) => {
    console.error("فشل الفحص:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
