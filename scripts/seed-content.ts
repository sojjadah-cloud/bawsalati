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

/**
 * النبذة تصف الخدمة التي يقدّمها المختص لا سيرته الشخصية.
 * لا مؤهلات ولا سنوات خبرة ولا جهات تخرّج: تلك بيانات عن أشخاص حقيقيين
 * لا تُكتب نيابةً عنهم. كل مختص يبدّل نبذته من لوحته متى شاء.
 */
const SPECIALISTS = [
  {
    name: "نعيم الدبدوب",
    email: "naeem@bawsalati.om",
    bio: "يستقبل طلاب المدرسة لمناقشة نتيجة مقياس الميول المهنية وقراءتها معهم، وربط البيئات الأعلى في النتيجة بالتخصصات والمسارات المتاحة بعد الثانوية. احجز موعداً وأحضر معك رابط نتيجتك إن كنت قد أدّيت المقياس.",
  },
  {
    name: "محمد السريحي",
    email: "mohammed@bawsalati.om",
    bio: "يساعد الطلاب على المفاضلة بين التخصصات وترتيب الرغبات، وفهم إجراءات القبول ومواعيدها كما وردت في دليل الطالب. احجز موعداً إن كنت مرتبكاً بين أكثر من خيار أو تحتاج ترتيب خطواتك القادمة.",
  },
  {
    name: "محمود الدباني",
    email: "mahmoud@bawsalati.om",
    bio: "يناقش مع الطلاب مهارات الدراسة وتنظيم الوقت والاستعداد للاختبارات، إضافةً إلى قراءة نتيجة المقياس واختيار التخصص. احجز موعداً إن كانت درجاتك لا تعكس جهدك أو أردت خطة مذاكرة تناسبك.",
  },
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

    // النبذة الافتراضية تُكتب مرة واحدة: ما كتبه المختص بنفسه لا يُستبدل.
    const existing = await prisma.specialistProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, bio: true },
    });

    const profile = existing
      ? await prisma.specialistProfile.update({
          where: { id: existing.id },
          data: existing.bio.trim() ? {} : { bio: s.bio },
          select: { id: true },
        })
      : await prisma.specialistProfile.create({
          data: { userId: user.id, title: "مختص التوجيه المهني", bio: s.bio },
          select: { id: true },
        });

    await seedAvailability(profile.id);
  }

  console.log(`  ✔ المختصون: ${SPECIALISTS.length} بنبذة وأوقات استقبال`);
}

/* ───────────────────────── أوقات الاستقبال ───────────────────────── */

/** أيام الدراسة: الأحد إلى الخميس. 0 = الأحد. */
const SCHOOL_DAYS = [0, 1, 2, 3, 4];
const SCHOOL_HOURS = { startTime: "08:00", endTime: "12:00", slotMinutes: 30 };

/**
 * يوم دراسي كامل لكل مختص كي يجد الطالب وقتاً متاحاً من أول يوم.
 * لا يُمسّ من ضبط أوقاته بنفسه: وجود أي سطر يعني أن المختص تولّى الأمر.
 */
async function seedAvailability(specialistId: string) {
  const existing = await prisma.specialistAvailability.count({ where: { specialistId } });
  if (existing > 0) return;

  await prisma.specialistAvailability.createMany({
    data: SCHOOL_DAYS.map((weekday) => ({ specialistId, weekday, ...SCHOOL_HOURS, active: true })),
  });
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
