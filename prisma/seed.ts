/**
 * بذور قاعدة بيانات بوصلتي.
 *
 * كل ما يخصّ المنهجية (العبارات، الأبعاد، جداول التحويل) يأتي من
 * prisma/seed-data/assessment-v1.json المستخرج حرفياً من التطبيق القائم.
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
    groupCount: number;
    questionsPerGroup: number;
  };
  options: { value: number; label: string; displayOrder: number }[];
  dimensions: {
    code: string;
    label: string;
    description: string;
    color: string;
    fields: string[];
    displayOrder: number;
    items: string[];
  }[];
  scoring: {
    method: string;
    notes: string;
    gradeBands: string[];
    percentiles: Record<string, Record<string, number[]>>;
  };
}

const data: SeedData = JSON.parse(
  readFileSync(join(process.cwd(), "prisma", "seed-data", "assessment-v1.json"), "utf8")
);

const INTRO = [
  "اختبار بوصلتي أداة تساعدك على التعرّف على ميولك المهنية، أي أنواع الأعمال التي تنسجم مع طبيعتك واهتماماتك.",
  "يتكوّن الاختبار من 54 عبارة موزّعة على 9 مجموعات، وتستغرق الإجابة عليها نحو عشر دقائق.",
  "أجب بصدق وتلقائية عمّا ينطبق عليك فعلاً، لا عمّا تظنّ أنه الأفضل. لا توجد إجابة صحيحة وأخرى خاطئة.",
  "نتيجة الاختبار مؤشّر يساعدك ويساعد مختص التوجيه المهني على اتخاذ قرار أفضل، وليست حكماً نهائياً عليك.",
].join("\n\n");

async function seedAssessment() {
  const def = await prisma.assessment.upsert({
    where: { code: data.assessment.code },
    update: {
      title: data.assessment.title,
      introduction: INTRO,
      groupCount: data.assessment.groupCount,
      questionsPerGroup: data.assessment.questionsPerGroup,
      active: true,
    },
    create: {
      code: data.assessment.code,
      title: data.assessment.title,
      description: "مقياس ميول مهنية من 54 عبارة موزّعة على ستة محاور.",
      introduction: INTRO,
      version: data.assessment.version,
      groupCount: data.assessment.groupCount,
      questionsPerGroup: data.assessment.questionsPerGroup,
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
  for (const dim of data.dimensions) {
    const row = await prisma.assessmentDimension.upsert({
      where: { assessmentId_code: { assessmentId: def.id, code: dim.code } },
      update: {
        label: dim.label,
        description: dim.description,
        color: dim.color,
        fields: dim.fields,
        displayOrder: dim.displayOrder,
      },
      create: {
        assessmentId: def.id,
        code: dim.code,
        label: dim.label,
        description: dim.description,
        color: dim.color,
        fields: dim.fields,
        displayOrder: dim.displayOrder,
      },
    });
    dimensionIds.set(dim.code, row.id);
  }

  // 9 مجموعات × 6 أسئلة — كل مجموعة تضم عبارة واحدة من كل محور.
  const groupIds = new Map<number, string>();
  for (let g = 1; g <= data.assessment.groupCount; g++) {
    const row = await prisma.assessmentGroup.upsert({
      where: { assessmentId_number: { assessmentId: def.id, number: g } },
      update: { title: `المجموعة ${g}`, displayOrder: g },
      create: {
        assessmentId: def.id,
        number: g,
        title: `المجموعة ${g}`,
        displayOrder: g,
      },
    });
    groupIds.set(g, row.id);
  }

  const ordered = [...data.dimensions].sort((a, b) => a.displayOrder - b.displayOrder);
  let created = 0;
  for (let g = 1; g <= data.assessment.groupCount; g++) {
    for (let i = 0; i < ordered.length; i++) {
      const dim = ordered[i];
      const text = dim.items[g - 1];
      if (!text) throw new Error(`ينقص نص العبارة ${g} للمحور ${dim.code}`);
      const displayOrder = i + 1;
      const number = (g - 1) * data.assessment.questionsPerGroup + displayOrder;

      await prisma.assessmentQuestion.upsert({
        where: { assessmentId_number: { assessmentId: def.id, number } },
        update: {
          text,
          groupId: groupIds.get(g)!,
          dimensionId: dimensionIds.get(dim.code)!,
          displayOrder,
          active: true,
        },
        create: {
          assessmentId: def.id,
          groupId: groupIds.get(g)!,
          dimensionId: dimensionIds.get(dim.code)!,
          number,
          text,
          displayOrder,
          active: true,
        },
      });
      created++;
    }
  }
  console.log(`  ✔ المقياس: ${created} سؤالاً في ${data.assessment.groupCount} مجموعات`);

  return { assessmentId: def.id, dimensionIds };
}

async function seedScoring(assessmentId: string, dimensionIds: Map<string, string>) {
  const existing = await prisma.scoringRuleSet.findUnique({
    where: { assessmentId_version: { assessmentId, version: 1 } },
    select: { id: true },
  });

  const ruleSet =
    existing ??
    (await prisma.scoringRuleSet.create({
      data: {
        assessmentId,
        version: 1,
        method: data.scoring.method,
        notes: `${data.scoring.notes} — ${data.provenance}`,
        active: true,
      },
      select: { id: true },
    }));

  await prisma.scoringRuleSet.update({
    where: { id: ruleSet.id },
    data: { active: true },
  });

  let count = 0;
  for (const band of data.scoring.gradeBands) {
    const table = data.scoring.percentiles[band];
    for (const [code, values] of Object.entries(table)) {
      const dimensionId = dimensionIds.get(code);
      if (!dimensionId) throw new Error(`محور غير معروف في جدول التحويل: ${code}`);
      for (let raw = 0; raw < values.length; raw++) {
        await prisma.scoringRule.upsert({
          where: {
            ruleSetId_dimensionId_gradeBand_rawScore: {
              ruleSetId: ruleSet.id,
              dimensionId,
              gradeBand: band,
              rawScore: raw,
            },
          },
          update: { percentile: values[raw] },
          create: {
            ruleSetId: ruleSet.id,
            dimensionId,
            gradeBand: band,
            rawScore: raw,
            percentile: values[raw],
          },
        });
        count++;
      }
    }
  }
  console.log(`  ✔ قواعد التصحيح: ${count} قاعدة (الإصدار 1، فعّال)`);
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

/** حسابات التطوير فقط. في الإنتاج تُنشأ الحسابات من لوحة المدير. */
const DEV_PASSWORD = process.env.SEED_PASSWORD || "Bawsalati@2026";

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

  console.log(`  ✔ الحسابات: مدير + مختص (كلمة المرور: ${DEV_PASSWORD})`);
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
  const { assessmentId, dimensionIds } = await seedAssessment();
  await seedScoring(assessmentId, dimensionIds);
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
