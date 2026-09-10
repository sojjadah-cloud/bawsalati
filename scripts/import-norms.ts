/**
 * استيراد الجداول المعيارية الرسمية (تحويل الدرجة الخام إلى رتبة مئينية).
 *
 *   npx tsx scripts/import-norms.ts prisma/seed-data/norms.csv
 *
 * صيغة الملف: سطر لكل (صف، نوع، بيئة)، وفيه عشر قيم للدرجات من 0 إلى 9.
 *
 *   grade,gender,code,p0,p1,p2,p3,p4,p5,p6,p7,p8,p9
 *   10,MALE,و,2,6,11,23,38,54,71,87,95,99
 *
 * grade: 9 أو 10 أو 11 أو 12
 * gender: MALE أو FEMALE
 * code: و س ف ا م ت
 *
 * الأسطر الفارغة والتي تبدأ بـ # تُتجاهل.
 *
 * السكربت يرفض الاستيراد الناقص: يجب أن تكتمل كل التوليفات قبل التفعيل،
 * حتى لا يقع طالب على درجة بلا قاعدة تحويل بعد إتمام الاختبار.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, type Gender } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const GRADES = ["9", "10", "11", "12"];
const GENDERS: Gender[] = ["MALE", "FEMALE"];
const RAW_SCORES = 10; // 0..9

interface NormRow {
  grade: string;
  gender: Gender;
  code: string;
  percentiles: number[];
}

function parse(csv: string): NormRow[] {
  const rows: NormRow[] = [];

  csv.split(/\r?\n/u).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const parts = trimmed.split(",").map((p) => p.trim());
    if (parts[0] === "grade") return; // سطر العناوين

    if (parts.length !== 3 + RAW_SCORES) {
      throw new Error(
        `السطر ${index + 1}: عدد الأعمدة ${parts.length} بدل ${3 + RAW_SCORES}`
      );
    }

    const [grade, gender, code, ...values] = parts;
    if (!GRADES.includes(grade)) throw new Error(`السطر ${index + 1}: صف غير معروف «${grade}»`);
    if (!GENDERS.includes(gender as Gender)) {
      throw new Error(`السطر ${index + 1}: نوع غير معروف «${gender}»`);
    }

    const percentiles = values.map((v, i) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 99) {
        throw new Error(`السطر ${index + 1}: قيمة غير صالحة للدرجة ${i} «${v}»`);
      }
      return n;
    });

    rows.push({ grade, gender: gender as Gender, code, percentiles });
  });

  return rows;
}

async function main() {
  const [pathArg] = process.argv.slice(2);
  if (!pathArg) {
    console.error("الاستخدام: npx tsx scripts/import-norms.ts <مسار ملف CSV>");
    process.exit(1);
  }

  const assessment = await prisma.assessment.findFirst({
    where: { active: true },
    select: { id: true, title: true },
  });
  if (!assessment) throw new Error("لا يوجد مقياس فعّال. شغّل npm run seed أولاً.");

  const dimensions = await prisma.assessmentDimension.findMany({
    where: { assessmentId: assessment.id },
    select: { id: true, code: true, label: true },
  });
  const byCode = new Map(dimensions.map((d) => [d.code, d]));

  const rows = parse(readFileSync(resolve(process.cwd(), pathArg), "utf8"));

  // اكتمال التغطية شرط للتفعيل.
  const seen = new Set<string>();
  for (const row of rows) {
    if (!byCode.has(row.code)) {
      throw new Error(`بيئة غير معروفة «${row.code}». المتوقّع: ${[...byCode.keys()].join(" ")}`);
    }
    const key = `${row.grade}|${row.gender}|${row.code}`;
    if (seen.has(key)) throw new Error(`تكرار: ${key}`);
    seen.add(key);
  }

  const missing: string[] = [];
  for (const grade of GRADES) {
    for (const gender of GENDERS) {
      for (const code of byCode.keys()) {
        if (!seen.has(`${grade}|${gender}|${code}`)) missing.push(`${grade} ${gender} ${code}`);
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `الجداول ناقصة (${missing.length} توليفة). أول الناقص: ${missing.slice(0, 5).join(" · ")}`
    );
  }

  const latest = await prisma.scoringRuleSet.findFirst({
    where: { assessmentId: assessment.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  await prisma.$transaction(async (tx) => {
    // إصدار واحد فعّال في كل وقت؛ النتائج السابقة تبقى مربوطة بإصدارها.
    await tx.scoringRuleSet.updateMany({
      where: { assessmentId: assessment.id, active: true },
      data: { active: false },
    });

    await tx.scoringRuleSet.create({
      data: {
        assessmentId: assessment.id,
        version,
        method: "COUNT_PREFERRED_THEN_PERCENTILE",
        notes: `الجداول المعيارية الرسمية، مستوردة من ${pathArg}`,
        active: true,
        rules: {
          create: rows.flatMap((row) =>
            row.percentiles.map((percentile, rawScore) => ({
              dimensionId: byCode.get(row.code)!.id,
              gradeBand: row.grade,
              gender: row.gender,
              rawScore,
              percentile,
            }))
          ),
        },
      },
    });
  });

  console.log(
    `✅ استُوردت ${rows.length * RAW_SCORES} قاعدة تحويل كإصدار ${version} وفُعّل للمقياس «${assessment.title}».`
  );
}

main()
  .catch((e) => {
    console.error("❌ فشل الاستيراد:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
