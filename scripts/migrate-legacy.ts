/**
 * ترحيل بيانات بوصلتي من قاعدة البوّابة المدرسية القديمة (`portal`)
 * إلى قاعدة بوصلتي المستقلة.
 *
 * السكربت للقراءة فقط من القاعدة القديمة — لا يعدّلها ولا يحذف منها شيئاً.
 * تشغيله أكثر من مرة آمن.
 *
 *   npx tsx scripts/migrate-legacy.ts
 *
 * ما يُرحَّل:
 *   • البرامج الدراسية (بيانات دليل الطالب) — كاملة
 *   • موارد المكتبة — كمسودّات غير منشورة، لأن روابطها في النظام القديم عناصر نائبة
 *
 * ما لا يُرحَّل ولماذا:
 *   • نتائج اختبارات قديمة: بيانات تجريبية بأسماء غير حقيقية، وبعضها بترميز تالف
 *   • استشارات قديمة: نصوصها العربية تلفت في عنقود قديم بترميز WIN1252
 *   • الحضور والصفوف والأنشطة والأخبار: تخص منصات أخرى خارج نطاق بوصلتي
 */
import "dotenv/config";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const LEGACY_URL = process.env.LEGACY_DATABASE_URL;

/** تصنيف المكتبة القديم ← معرّف التصنيف الجديد. */
const CATEGORY_MAP: Record<string, string> = {
  "التوجيه المهني": "career-guidance",
  البعثات: "career-guidance",
  "مهارات دراسية": "personal-skills",
  "تطوير الذات": "personal-skills",
  "قصص ملهمة": "personal-skills",
};

const TYPE_MAP: Record<string, "READABLE" | "AUDIO" | "LINK" | "OTHER"> = {
  EBOOK: "READABLE",
  AUDIO: "AUDIO",
  GUIDANCE: "READABLE",
};

/** النصوص التي تلفت في العنقود القديم تظهر كعلامات استفهام فقط. */
function isCorrupted(text: string): boolean {
  return /^[?\s]+$/u.test(text);
}

async function migratePrograms(legacy: Client) {
  const { rows } = await legacy.query(
    'SELECT code, name, field, institution, country, type, requirements, link FROM "Program"'
  );
  let migrated = 0;
  let skipped = 0;
  for (const r of rows) {
    if (isCorrupted(r.name) || isCorrupted(r.field)) {
      skipped++;
      continue;
    }
    await prisma.program.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        field: r.field,
        institution: r.institution,
        country: r.country,
        type: r.type,
        requirements: r.requirements,
        link: r.link,
      },
      create: {
        code: r.code,
        name: r.name,
        field: r.field,
        institution: r.institution,
        country: r.country,
        type: r.type,
        requirements: r.requirements,
        link: r.link,
      },
    });
    migrated++;
  }
  console.log(`  ✔ البرامج الدراسية: ${migrated} مُرحَّل${skipped ? `، ${skipped} متجاوَز (نص تالف)` : ""}`);
}

async function migrateBooks(legacy: Client) {
  const { rows } = await legacy.query(
    'SELECT title, author, type, category, description, link, cover FROM "Book"'
  );

  const categories = await prisma.libraryCategory.findMany({
    select: { id: true, slug: true },
  });
  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const fallback = bySlug.get("career-guidance");
  if (!fallback) throw new Error("شغّل npm run seed أولاً — تصنيفات المكتبة غير موجودة");

  let migrated = 0;
  let skipped = 0;
  for (const r of rows) {
    if (isCorrupted(r.title)) {
      skipped++;
      continue;
    }
    const slug = CATEGORY_MAP[r.category ?? ""] ?? "career-guidance";
    const categoryId = bySlug.get(slug) ?? fallback;

    const existing = await prisma.libraryResource.findFirst({
      where: { title: r.title, categoryId },
      select: { id: true },
    });
    if (existing) continue;

    // الرابط "#" في النظام القديم عنصر نائب، لا مورد حقيقي.
    const realLink = r.link && r.link !== "#" && r.link.startsWith("http") ? r.link : null;

    await prisma.libraryResource.create({
      data: {
        categoryId,
        title: r.title,
        description: r.description ?? "",
        type: realLink ? "LINK" : (TYPE_MAP[r.type] ?? "OTHER"),
        author: r.author ?? "",
        coverUrl: r.cover ?? null,
        externalUrl: realLink,
        // تبقى مسودّة حتى يرفق المختص الملف الفعلي — لا يظهر للطلاب مورد بلا محتوى.
        published: false,
        downloadable: false,
      },
    });
    migrated++;
  }
  console.log(
    `  ✔ موارد المكتبة: ${migrated} مُرحَّل كمسودّة${skipped ? `، ${skipped} متجاوَز (نص تالف)` : ""}`
  );
}

async function main() {
  if (!LEGACY_URL) {
    console.error("❌ LEGACY_DATABASE_URL غير مضبوط في .env");
    process.exit(1);
  }

  console.log("\n📦 ترحيل بيانات بوصلتي من القاعدة القديمة\n");
  const legacy = new Client({ connectionString: LEGACY_URL });
  await legacy.connect();

  try {
    await migratePrograms(legacy);
    await migrateBooks(legacy);
    console.log("\n✅ اكتمل الترحيل. القاعدة القديمة لم تُمسّ.\n");
  } finally {
    await legacy.end();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ فشل الترحيل:", e);
  process.exit(1);
});
