/**
 * بذور قاعدة بيانات بوصلتي.
 *
 * كل ما يخصّ المنهجية (العبارات، الأبعاد، جداول التحويل) يأتي من
 * لا تُخترع هنا أي قيمة منهجية.
 *
 * السكربت idempotent: تشغيله مرتين لا يكرّر البيانات.
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

interface SeedData {
  provenance: string;
  assessment: {
    code: string;
    title: string;
    version: number;
    blockCount: number;
    questionsPerBlock: number;
  };
  options: { value: number; label: string; displayOrder: number }[];
  blocks: { number: number; title: string }[];
  dimensions: {
    code: string;
    key: string;
    label: string;
    description: string;
    color: string;
    displayOrder: number;
    questionNumbers: number[];
  }[];
  questions: { number: number; text: string }[];
  scoring: { method: string; notes: string; gradeBands: string[]; genders: string[] };
}

const data: SeedData = JSON.parse(
  readFileSync(join(process.cwd(), "prisma", "seed-data", "assessment-official.json"), "utf8")
);

const INTRO = [
  "مقياس الميول المهنية أداة تساعدك على التعرّف على البيئات المهنية الأقرب إلى ميولك.",
  "يتكوّن من 54 عبارة، وتستغرق الإجابة عليها نحو عشر دقائق.",
  "اقرأ كل عبارة واختر «أفضّل هذا النشاط» أو «لا أفضّل هذا النشاط» بصدق وتلقائية. لا توجد إجابة صحيحة وأخرى خاطئة.",
  "النتيجة مؤشّر يساعدك ويساعد مختص التوجيه المهني على اتخاذ قرار أفضل، ويعتمدها المختص بعد مراجعتها معك.",
].join("\n\n");

async function seedAssessment() {
  // المقاييس السابقة تبقى في القاعدة لأن نتائج قديمة مرتبطة بها، لكنها تُعطَّل.
  await prisma.assessment.updateMany({
    where: { code: { not: data.assessment.code } },
    data: { active: false },
  });

  const def = await prisma.assessment.upsert({
    where: { code: data.assessment.code },
    update: {
      title: data.assessment.title,
      introduction: INTRO,
      groupCount: data.assessment.blockCount,
      questionsPerGroup: data.assessment.questionsPerBlock,
      active: true,
    },
    create: {
      code: data.assessment.code,
      title: data.assessment.title,
      description: "مقياس ميول مهنية من 54 عبارة موزّعة على ست بيئات مهنية.",
      introduction: INTRO,
      version: data.assessment.version,
      groupCount: data.assessment.blockCount,
      questionsPerGroup: data.assessment.questionsPerBlock,
      active: true,
    },
  });

  for (const opt of data.options) {
    await prisma.assessmentOption.upsert({
      where: { assessmentId_value: { assessmentId: def.id, value: opt.value } },
      update: { label: opt.label, displayOrder: opt.displayOrder },
      create: {
        assessmentId: def.id,
        value: opt.value,
        label: opt.label,
        displayOrder: opt.displayOrder,
      },
    });
  }

  const dimensionIds = new Map<string, string>();
  /** رقم السؤال ← البيئة التي ينتمي إليها، حسب توزيع الدليل. */
  const questionDimension = new Map<number, string>();

  for (const dim of data.dimensions) {
    const row = await prisma.assessmentDimension.upsert({
      where: { assessmentId_code: { assessmentId: def.id, code: dim.code } },
      update: {
        key: dim.key,
        label: dim.label,
        description: dim.description,
        color: dim.color,
        displayOrder: dim.displayOrder,
      },
      create: {
        assessmentId: def.id,
        code: dim.code,
        key: dim.key,
        label: dim.label,
        description: dim.description,
        color: dim.color,
        displayOrder: dim.displayOrder,
      },
    });
    dimensionIds.set(dim.code, row.id);

    if (dim.questionNumbers.length !== 9) {
      throw new Error(`البيئة ${dim.code} يجب أن تحمل 9 عبارات لا ${dim.questionNumbers.length}`);
    }
    for (const n of dim.questionNumbers) {
      if (questionDimension.has(n)) {
        throw new Error(`العبارة ${n} منسوبة لأكثر من بيئة`);
      }
      questionDimension.set(n, dim.code);
    }
  }

  if (questionDimension.size !== 54) {
    throw new Error(`التوزيع يغطّي ${questionDimension.size} عبارة بدل 54`);
  }

  // ثلاث دفعات × 18 عبارة، كما هي مقسّمة في الدليل.
  const groupIds = new Map<number, string>();
  for (const block of data.blocks) {
    const row = await prisma.assessmentGroup.upsert({
      where: { assessmentId_number: { assessmentId: def.id, number: block.number } },
      update: { title: block.title, displayOrder: block.number },
      create: {
        assessmentId: def.id,
        number: block.number,
        title: block.title,
        displayOrder: block.number,
      },
    });
    groupIds.set(block.number, row.id);
  }

  for (const q of data.questions) {
    const code = questionDimension.get(q.number);
    if (!code) throw new Error(`العبارة ${q.number} بلا بيئة`);
    const blockNumber = Math.floor((q.number - 1) / data.assessment.questionsPerBlock) + 1;
    const displayOrder = ((q.number - 1) % data.assessment.questionsPerBlock) + 1;

    await prisma.assessmentQuestion.upsert({
      where: { assessmentId_number: { assessmentId: def.id, number: q.number } },
      update: {
        text: q.text,
        groupId: groupIds.get(blockNumber)!,
        dimensionId: dimensionIds.get(code)!,
        displayOrder,
        active: true,
      },
      create: {
        assessmentId: def.id,
        groupId: groupIds.get(blockNumber)!,
        dimensionId: dimensionIds.get(code)!,
        number: q.number,
        text: q.text,
        displayOrder,
        active: true,
      },
    });
  }

  console.log(
    `  ✔ المقياس: ${data.questions.length} عبارة في ${data.blocks.length} دفعات، ${data.dimensions.length} بيئات`
  );

  return { assessmentId: def.id, dimensionIds };
}

/**
 * مجموعة قواعد فارغة بانتظار الجداول المعيارية الرسمية.
 * تبقى غير فعّالة عمداً: لا تُحتسب نتيجة بجدول لم يُدخَل بعد.
 */
async function seedScoring(assessmentId: string) {
  const existing = await prisma.scoringRuleSet.findUnique({
    where: { assessmentId_version: { assessmentId, version: 1 } },
    select: { id: true, _count: { select: { rules: true } } },
  });

  if (!existing) {
    await prisma.scoringRuleSet.create({
      data: {
        assessmentId,
        version: 1,
        method: data.scoring.method,
        notes: `${data.scoring.notes} — ${data.provenance}`,
        active: false,
      },
    });
    console.log("  ⚠ قواعد التحويل: مجموعة فارغة بانتظار الجداول المعيارية (غير فعّالة)");
    return;
  }

  console.log(
    existing._count.rules > 0
      ? `  ✔ قواعد التحويل: ${existing._count.rules} قاعدة`
      : "  ⚠ قواعد التحويل: لم تُدخل الجداول المعيارية بعد (غير فعّالة)"
  );
}

const CATEGORIES = [
  {
    slug: "career-guidance",
    name: "كتب التوجيه المهني",
    description: "مراجع تساعدك على فهم المسارات المهنية واختيار التخصص المناسب.",
    displayOrder: 1,
  },
  {
    slug: "personal-skills",
    name: "كتب تنمية المهارات الشخصية",
    description: "مهارات التواصل وإدارة الوقت والدراسة وبناء الثقة بالنفس.",
    displayOrder: 2,
  },
  {
    slug: "science",
    name: "كتب علمية",
    description: "مراجع علمية تثري معرفتك وتوسّع اهتماماتك البحثية.",
    displayOrder: 3,
  },
];

async function seedLibrary() {
  for (const c of CATEGORIES) {
    await prisma.libraryCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, displayOrder: c.displayOrder },
      create: { ...c, active: true },
    });
  }
  console.log(`  ✔ تصنيفات المكتبة: ${CATEGORIES.length}`);
}

const TOPICS = [
  { slug: "major-choice", name: "اختيار التخصص الجامعي", displayOrder: 1 },
  { slug: "scholarships", name: "البعثات والمنح الدراسية", displayOrder: 2 },
  { slug: "assessment-result", name: "تفسير نتيجة اختبار بوصلتي", displayOrder: 3 },
  { slug: "career-path", name: "المسارات المهنية وسوق العمل", displayOrder: 4 },
  { slug: "study-skills", name: "مهارات الدراسة والاستعداد للامتحانات", displayOrder: 5 },
  { slug: "other", name: "أخرى", displayOrder: 99, requiresDetails: true },
];

async function seedTopics() {
  for (const t of TOPICS) {
    await prisma.consultationTopic.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        displayOrder: t.displayOrder,
        requiresDetails: t.requiresDetails ?? false,
        active: true,
      },
      create: {
        slug: t.slug,
        name: t.name,
        displayOrder: t.displayOrder,
        requiresDetails: t.requiresDetails ?? false,
        active: true,
      },
    });
  }
  console.log(`  ✔ مواضيع الاستشارة: ${TOPICS.length}`);
}

/**
 * كلمة مرور الحسابات الأولى.
 * في الإنتاج لا قيمة افتراضية: يجب ضبط SEED_PASSWORD صراحةً حتى لا تُنشر
 * المنصة بكلمة مرور معروفة. تُستخدم عند إنشاء الحساب فقط، ولا تُعيد ضبط
 * كلمة مرور حساب قائم.
 */
function seedPassword(): string {
  const fromEnv = process.env.SEED_PASSWORD?.trim();
  if (fromEnv) {
    if (fromEnv.length < 10) {
      throw new Error("SEED_PASSWORD يجب أن تكون 10 محارف على الأقل");
    }
    return fromEnv;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SEED_PASSWORD غير مضبوط. اضبطه قبل التهيئة في الإنتاج حتى لا تُنشأ حسابات بكلمة مرور معروفة."
    );
  }
  return "Bawsalati@2026";
}

const DEV_PASSWORD = seedPassword();

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: "admin@bawsalati.om" },
    update: { role: "ADMIN", active: true },
    create: {
      name: "مدير النظام",
      email: "admin@bawsalati.om",
      passwordHash,
      role: "ADMIN",
    },
  });

  const specialistUser = await prisma.user.upsert({
    where: { email: "naeem@bawsalati.om" },
    update: { role: "SPECIALIST", active: true },
    create: {
      name: "نعيم الدبدوب",
      email: "naeem@bawsalati.om",
      passwordHash,
      role: "SPECIALIST",
    },
  });

  const profile = await prisma.specialistProfile.upsert({
    where: { userId: specialistUser.id },
    update: {},
    create: {
      userId: specialistUser.id,
      title: "مختص التوجيه المهني",
      bio: "يقدّم استشارات فردية للطلاب في اختيار التخصص والمسار المهني.",
      notifyPhone: "96892549426",
      bookable: true,
      slotMinutes: 30,
    },
  });

  // دوام أسبوعي افتراضي: الأحد إلى الخميس صباحاً.
  for (let weekday = 0; weekday <= 4; weekday++) {
    await prisma.specialistAvailability.upsert({
      where: {
        specialistId_weekday_startTime: {
          specialistId: profile.id,
          weekday,
          startTime: "08:00",
        },
      },
      update: { endTime: "12:00", slotMinutes: 30, active: true },
      create: {
        specialistId: profile.id,
        weekday,
        startTime: "08:00",
        endTime: "12:00",
        slotMinutes: 30,
        active: true,
      },
    });
  }

  console.log(
    process.env.NODE_ENV === "production"
      ? "  ✔ الحسابات: مدير + مختص (كلمة المرور من SEED_PASSWORD)"
      : `  ✔ الحسابات: مدير + مختص (كلمة المرور: ${DEV_PASSWORD})`
  );
  return profile.id;
}

async function seedSettings() {
  const settings: Record<string, string> = {
    "site.title": "بوصلتي — منصة التوجيه المهني",
    "site.description":
      "منصة تساعد الطالب على اكتشاف ميوله المهنية، والوصول إلى مكتبة رقمية، وحجز استشارة مع مختص التوجيه المهني.",
    "site.email": "bawsalati@soharboys.edu.om",
    "site.phone": "+968 92549426",
    "booking.horizonDays": "21",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log(`  ✔ الإعدادات: ${Object.keys(settings).length}`);
}

async function main() {
  console.log("\n🧭 تهيئة قاعدة بيانات بوصلتي\n");
  const { assessmentId } = await seedAssessment();
  await seedScoring(assessmentId);
  await seedLibrary();
  await seedTopics();
  await seedUsers();
  await seedSettings();
  console.log("\n✅ اكتملت التهيئة.\n");
}

main()
  .catch((e) => {
    console.error("❌ فشلت التهيئة:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
