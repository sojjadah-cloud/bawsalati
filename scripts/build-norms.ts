/**
 * اشتقاق الجداول المعيارية من نتائج الطلبة واعتمادها إصداراً رسمياً.
 *
 *   npm run norms:build              # عرض ما سيحدث
 *   npm run norms:build -- --apply   # إنشاء الإصدار وتفعيله
 *   npm run norms:build -- --apply --min 25
 *
 * الرتبة المئينية تُحسب لكل (بيئة، صف، جنس) من درجات من أدّى المقياس فعلاً،
 * وهو تعريفها الإحصائي: نسبة من هم دون الطالب في مجموعته المرجعية.
 *
 * الخلية التي لم تبلغ عيّنتها الحدّ الأدنى لا تُعتمد، وتُنقل قيمتها من
 * الجدول الفعّال الحالي، ويبقى الإصدار موسوماً مؤقّتاً حتى تكتمل كل الخلايا.
 */
import "dotenv/config";
import { PrismaClient, type Gender } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildNorms, MAX_RAW, MIN_SAMPLE } from "../src/features/assessment/norming";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const GRADE_BANDS = ["9", "10", "11", "12"];
const GENDERS: Gender[] = ["MALE", "FEMALE"];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const minSample = Number(arg("--min") ?? MIN_SAMPLE);
  if (!Number.isInteger(minSample) || minSample < 5) {
    throw new Error("الحدّ الأدنى للعيّنة يجب أن يكون عدداً صحيحاً لا يقلّ عن 5");
  }

  const assessment = await prisma.assessment.findFirst({
    where: { active: true },
    select: { id: true, title: true },
  });
  if (!assessment) throw new Error("لا يوجد مقياس فعّال.");

  const dimensions = await prisma.assessmentDimension.findMany({
    where: { assessmentId: assessment.id },
    select: { id: true, code: true, label: true },
    orderBy: { displayOrder: "asc" },
  });

  // النتائج المحفوظة تحمل رمز البيئة لا معرّفها، فيُربط بالمعرّف هنا
  const idByCode = new Map(dimensions.map((d) => [d.code, d.id]));

  // درجات خام من جلسات مكتملة فقط، مع صفّ الطالب وجنسه
  const sections = await prisma.assessmentResultSection.findMany({
    where: { result: { session: { status: "SUBMITTED" } } },
    select: {
      dimensionCode: true,
      rawScore: true,
      result: { select: { session: { select: { grade: true, gender: true } } } },
    },
  });

  const observations = sections.flatMap((s) => {
    const dimensionId = idByCode.get(s.dimensionCode);
    if (!dimensionId) return [];
    return [
      {
        dimensionId,
        rawScore: s.rawScore,
        gradeBand: s.result.session.grade,
        gender: s.result.session.gender,
      },
    ];
  });

  console.log(`\n📐 اشتقاق المعايير من ${observations.length} درجة خام\n`);
  if (observations.length === 0) {
    console.log("لا توجد نتائج بعد. طبّق المقياس على الطلبة أولاً.\n");
    return;
  }

  const groups = buildNorms(observations, minSample);
  const accepted = groups.filter((g) => g.accepted);
  const expectedGroups = dimensions.length * GRADE_BANDS.length * GENDERS.length;

  console.log(`  الخلايا المطلوبة: ${expectedGroups} (بيئة × صف × جنس)`);
  console.log(`  الخلايا التي بلغت ${minSample} طالباً: ${accepted.length}`);

  const byGrade = new Map<string, number>();
  for (const g of groups) {
    const key = `${g.gradeBand}/${g.gender === "MALE" ? "ذكر" : "أنثى"}`;
    byGrade.set(key, Math.max(byGrade.get(key) ?? 0, g.sample));
  }
  console.log("\n  حجم العيّنة لكل مجموعة مرجعية:");
  for (const [key, n] of [...byGrade.entries()].sort()) {
    console.log(`    ${key.padEnd(10)} ${n} طالباً${n >= minSample ? " ✔" : ` (ينقص ${minSample - n})`}`);
  }

  const complete = accepted.length === expectedGroups;
  console.log(
    `\n  ${complete ? "✔ التغطية كاملة: يمكن اعتماد الجدول رسمياً." : "⚠ التغطية ناقصة: سيبقى الإصدار موسوماً مؤقّتاً."}`
  );

  if (!apply) {
    console.log("\nأعد الأمر مع --apply للإنشاء والتفعيل.\n");
    return;
  }

  // الخلايا الناقصة تُنقل من الجدول الفعّال حتى لا ينكسر التصحيح
  const current = await prisma.scoringRuleSet.findFirst({
    where: { active: true },
    select: { id: true, version: true, rules: { select: { dimensionId: true, gradeBand: true, gender: true, rawScore: true, percentile: true } } },
  });
  const carried = new Map(
    (current?.rules ?? []).map((r) => [`${r.dimensionId}|${r.gradeBand}|${r.gender}|${r.rawScore}`, r.percentile])
  );

  const rows: {
    dimensionId: string;
    gradeBand: string;
    gender: Gender;
    rawScore: number;
    percentile: number;
  }[] = [];
  const derived = new Set<string>();

  for (const g of accepted) {
    for (const c of g.cells) {
      rows.push({ ...c, gender: c.gender as Gender });
      derived.add(`${c.dimensionId}|${c.gradeBand}|${c.gender}|${c.rawScore}`);
    }
  }

  let carriedCount = 0;
  for (const dim of dimensions) {
    for (const gradeBand of GRADE_BANDS) {
      for (const gender of GENDERS) {
        for (let rawScore = 0; rawScore <= MAX_RAW; rawScore++) {
          const key = `${dim.id}|${gradeBand}|${gender}|${rawScore}`;
          if (derived.has(key)) continue;
          const fallback = carried.get(key);
          if (fallback === undefined) {
            throw new Error(
              `لا قيمة سابقة للخلية ${dim.code}/${gradeBand}/${gender}/${rawScore}. شغّل npm run norms:provisional أولاً.`
            );
          }
          rows.push({ dimensionId: dim.id, gradeBand, gender, rawScore, percentile: fallback });
          carriedCount++;
        }
      }
    }
  }

  const latest = await prisma.scoringRuleSet.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  const notes = [
    `مشتقّة من ${observations.length} درجة خام لطلبة أدّوا المقياس على المنصة.`,
    `الرتبة المئينية بصيغة نقطة المنتصف، والمجموعة المرجعية هي الصف والجنس معاً.`,
    `الحدّ الأدنى للعيّنة في الخلية: ${minSample} طالباً.`,
    carriedCount ? `${carriedCount} قيمة منقولة من الإصدار ${current?.version} لعدم كفاية عيّنتها.` : "كل القيم مشتقّة.",
    `تاريخ الاشتقاق: ${new Date().toISOString().slice(0, 10)}.`,
  ].join(" ");

  await prisma.$transaction(async (tx) => {
    await tx.scoringRuleSet.updateMany({ where: { active: true }, data: { active: false } });
    const set = await tx.scoringRuleSet.create({
      data: {
        assessmentId: assessment.id,
        version,
        method: "COUNT_PREFERRED_THEN_PERCENTILE",
        active: true,
        provisional: !complete,
        notes,
      },
      select: { id: true },
    });
    await tx.scoringRule.createMany({
      data: rows.map((r) => ({ ...r, ruleSetId: set.id })),
    });
  });

  console.log(
    `\n✅ اعتُمد الإصدار ${version}: ${rows.length} خلية، منها ${rows.length - carriedCount} مشتقّة` +
      `${complete ? " — جدول رسمي." : " — يبقى مؤقّتاً حتى تكتمل العيّنات."}\n`
  );
}

main()
  .catch((e) => {
    console.error("❌ فشل الاشتقاق:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
