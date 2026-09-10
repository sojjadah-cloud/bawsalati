/**
 * إدخال بنك أسئلة الدليل إلى قاعدة البيانات.
 *
 *   npm run faq:guide
 *
 * آمن عند التكرار: يحدّث المدخل الموجود بالسؤال نفسه بدل تكراره.
 * مدخلات الدليل تأخذ أولوية أعلى، فيرجَّح جوابها على الجواب العام
 * حين يتقارب التطابق.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** أولوية مدخلات الدليل. الأعلى يفوز عند تقارب درجات التطابق. */
const GUIDE_PRIORITY = 10;

interface GuideEntry {
  topic: string;
  q: string;
  a: string;
  k: string[];
  source: string;
  page: number;
}

async function main() {
  const file = process.argv[2] ?? join(process.cwd(), "prisma", "seed-data", "faq-guide.json");
  const { entries } = JSON.parse(readFileSync(file, "utf8")) as { entries: GuideEntry[] };

  console.log(`\n📘 إدخال ${entries.length} مدخلاً من دليل الطالب\n`);

  let added = 0;
  let updated = 0;

  for (const e of entries) {
    const existing = await prisma.faqEntry.findFirst({
      where: { question: e.q },
      select: { id: true },
    });

    const data = {
      answer: e.a,
      keywords: e.k ?? [],
      topic: e.topic,
      source: e.source,
      page: e.page,
      priority: GUIDE_PRIORITY,
      active: true,
    };

    if (existing) {
      await prisma.faqEntry.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.faqEntry.create({ data: { question: e.q, ...data } });
      added++;
    }
  }

  // مدخلات دليل قديمة لم تعد في الملف تُحذف، فلا يبقى جواب لصفحة تغيّرت
  const keep = new Set(entries.map((e) => e.q));
  const stale = await prisma.faqEntry.findMany({
    where: { source: "guide" },
    select: { id: true, question: true },
  });
  const toDelete = stale.filter((s) => !keep.has(s.question)).map((s) => s.id);
  if (toDelete.length) {
    await prisma.faqEntry.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`  ✔ حُذف ${toDelete.length} مدخلاً لم يعد في الدليل`);
  }

  const total = await prisma.faqEntry.count({ where: { active: true } });
  const fromGuide = await prisma.faqEntry.count({ where: { active: true, source: "guide" } });
  console.log(`  ✔ جديد: ${added}، محدَّث: ${updated}`);
  console.log(`  ✔ من الدليل: ${fromGuide}، الإجمالي: ${total}\n`);
}

main()
  .catch((e) => {
    console.error("❌ فشل الإدخال:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
