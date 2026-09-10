/**
 * تهيئة محتوى المنصة: المختصون، وفهرس المكتبة، وبنك أسئلة جويب.
 *
 *   npm run seed:content
 *
 * السكربت idempotent: تشغيله مرتين لا يكرّر شيئاً.
 * لا يمسّ بيانات الطلاب (الجلسات والنتائج والحجوزات).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), "prisma", "seed-data", name), "utf8"));
}

/* ───────────────────────── المختصون ───────────────────────── */

const SPECIALISTS = [
  { name: "نعيم الدبدوب", email: "naeem@bawsalati.om" },
  { name: "محمد السريحي", email: "mohammed@bawsalati.om" },
  { name: "محمود الدباني", email: "mahmoud@bawsalati.om" },
];

async function seedSpecialists() {
  const password = process.env.SEED_PASSWORD?.trim();
  if (!password && process.env.NODE_ENV === "production") {
    throw new Error("SEED_PASSWORD غير مضبوط.");
  }
  const passwordHash = await bcrypt.hash(password || "Bawsalati@2026", 12);

  for (const s of SPECIALISTS) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, role: "SPECIALIST", active: true },
      create: { name: s.name, email: s.email, passwordHash, role: "SPECIALIST" },
      select: { id: true },
    });

    // ملف فارغ عمداً: يملؤه المختص بنفسه من لوحته.
    await prisma.specialistProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, title: "مختص التوجيه المهني", bio: "" },
    });
  }

  console.log(`  ✔ المختصون: ${SPECIALISTS.length} بملفات فارغة`);
}

/* ───────────────────────── فهرس المكتبة ───────────────────────── */

interface CatalogFile {
  resources: {
    category: string;
    title: string;
    author: string;
    year?: number;
    description: string;
  }[];
}

async function seedLibrary() {
  const { resources } = readJson<CatalogFile>("library-catalog.json");

  const categories = await prisma.libraryCategory.findMany({
    select: { id: true, slug: true },
  });
  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let added = 0;
  for (const r of resources) {
    const categoryId = bySlug.get(r.category);
    if (!categoryId) throw new Error(`تصنيف غير معروف: ${r.category}. شغّل npm run seed أولاً.`);

    const existing = await prisma.libraryResource.findFirst({
      where: { title: r.title, categoryId },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.libraryResource.create({
      data: {
        categoryId,
        title: r.title,
        author: r.author,
        description: r.description,
        publishedYear: r.year ?? null,
        type: "READABLE",
        language: "ar",
        published: true,
        downloadable: false,
      },
    });
    added++;
  }

  const total = await prisma.libraryResource.count({
    where: { published: true, archivedAt: null },
  });
  console.log(`  ✔ المكتبة: ${added} مورداً جديداً، الإجمالي المنشور ${total}`);
}

/* ───────────────────────── بنك أسئلة جويب ───────────────────────── */

interface FaqFile {
  entries: { topic: string; q: string; a: string; k?: string[] }[];
}

async function seedFaq() {
  const { entries } = readJson<FaqFile>("faq.json");

  let added = 0;
  for (const e of entries) {
    const existing = await prisma.faqEntry.findFirst({
      where: { question: e.q },
      select: { id: true },
    });
    if (existing) {
      // الجواب والصيغ البديلة تُحدَّث، فتحسين الملف ينعكس بإعادة التشغيل.
      await prisma.faqEntry.update({
        where: { id: existing.id },
        data: { answer: e.a, keywords: e.k ?? [], topic: e.topic },
      });
      continue;
    }

    await prisma.faqEntry.create({
      data: {
        question: e.q,
        answer: e.a,
        keywords: e.k ?? [],
        topic: e.topic,
        active: true,
      },
    });
    added++;
  }

  const total = await prisma.faqEntry.count({ where: { active: true } });
  console.log(`  ✔ بنك أسئلة جويب: ${added} سؤالاً جديداً، الإجمالي ${total}`);
}

async function main() {
  console.log("\n📚 تهيئة محتوى بوصلتي\n");
  await seedSpecialists();
  await seedLibrary();
  await seedFaq();
  console.log("\n✅ اكتملت التهيئة.\n");
}

main()
  .catch((e) => {
    console.error("❌ فشلت التهيئة:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
