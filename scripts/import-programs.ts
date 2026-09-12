/**
 * إدخال دليل التخصصات والبرامج إلى قاعدة البيانات.
 *
 *   npm run programs:import
 *
 * آمن عند التكرار: يُطابق بالرمز فيحدّث الموجود ويضيف الجديد، ويحذف ما
 * لم يعد في الدليل. لا يمسّ عدّاد المشاهدة.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseRequirements } from "../src/features/programs/requirements";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface ProgramRow {
  code: string;
  name: string;
  field: string;
  programType: string;
  track: string;
  eligibility: string;
  requirements: string;
  tieBreakers: string;
  language: string;
  country: string;
  institution: string;
  qualification: string;
  notes: string;
  page: number | null;
}

async function main() {
  const file = process.argv[2] ?? join(process.cwd(), "prisma", "seed-data", "study-programs.json");
  const { programs } = JSON.parse(readFileSync(file, "utf8")) as { programs: ProgramRow[] };

  console.log(`\n🎓 إدخال ${programs.length} برنامجاً دراسياً\n`);

  let added = 0;
  let updated = 0;

  let withRules = 0;

  for (const p of programs) {
    // الشروط النثرية تُقرأ مرة واحدة عند الإدخال، فلا تُحلَّل مع كل طلب
    const parsed = parseRequirements(p.requirements);
    if (parsed.rules.length > 0) withRules++;

    const data = {
      name: p.name,
      field: p.field,
      programType: p.programType,
      track: p.track,
      eligibility: p.eligibility,
      requirements: p.requirements,
      tieBreakers: p.tieBreakers,
      language: p.language,
      country: p.country,
      institution: p.institution,
      qualification: p.qualification,
      notes: p.notes,
      guidePage: p.page,
      minOverall: parsed.minOverall,
      subjectRules: parsed.rules as unknown as Prisma.InputJsonValue,
      active: true,
    };

    const existing = await prisma.studyProgram.findUnique({
      where: { code: p.code },
      select: { id: true },
    });

    if (existing) {
      await prisma.studyProgram.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.studyProgram.create({ data: { code: p.code, ...data } });
      added++;
    }
  }

  const codes = programs.map((p) => p.code);
  const stale = await prisma.studyProgram.deleteMany({ where: { code: { notIn: codes } } });

  const fields = await prisma.studyProgram.groupBy({ by: ["field"], _count: { field: true } });
  const types = await prisma.studyProgram.groupBy({ by: ["programType"], _count: { programType: true } });
  const total = await prisma.studyProgram.count({ where: { active: true } });

  console.log(`  ✔ جديد: ${added}، محدَّث: ${updated}، محذوف: ${stale.count}`);
  console.log(`  ✔ المجالات: ${fields.length}، الأنواع: ${types.length}، الإجمالي: ${total}\n`);
}

main()
  .catch((e) => {
    console.error("❌ فشل الإدخال:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
