/**
 * نقل بيانات المنصة من قاعدة إلى قاعدة.
 *
 *   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... npm run db:copy
 *   أضف -- --apply للتنفيذ؛ بدونها معاينةٌ تعدّ ولا تكتب.
 *
 * لماذا نسخٌ بـPrisma لا pg_dump؟ لأنّ أدوات postgres الثنائية ليست
 * مثبّتة هنا، ولأنّ النسخ عبر المخطّط يضمن أنّ ما يُنقل هو ما يعرفه
 * التطبيق لا أكثر. والترتيب أدناه يحترم المفاتيح الأجنبية.
 *
 * قبل التشغيل: طبّق الترحيلات على القاعدة الجديدة وهي فارغة
 *   DATABASE_URL=<الجديدة> npx prisma migrate deploy
 *
 * لا يطبع السكربت عنوان أي قاعدة ولا كلمة مرورها — المضيف وحده يظهر.
 */
import { existsSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// عنوانا القاعدتين في ملفٍ مستقل مستثنى من المستودع، فلا يختلطان
// بإعداد التطوير ولا يُرفعان سهواً.
if (existsSync(".env.migrate")) loadEnv({ path: ".env.migrate", override: true });

const APPLY = process.argv.includes("--apply");

/** المضيف وحده، فلا تتسرّب كلمة المرور إلى سجلّ التشغيل. */
function hostOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}/${u.pathname.replace(/^\//, "") || "?"}`;
  } catch {
    return "عنوان غير صالح";
  }
}

function client(url: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

/**
 * ترتيب النقل: الأصل قبل فرعه دائماً.
 * الاسم كما في عميل Prisma، وكل جدولٍ يُنسخ كما هو بلا تحويل.
 */
const ORDER = [
  "user",
  "specialistProfile",
  "assessment",
  "assessmentGroup",
  "assessmentDimension",
  "assessmentQuestion",
  "assessmentOption",
  "scoringRuleSet",
  "scoringRule",
  "assessmentSession",
  "assessmentAnswer",
  "assessmentResult",
  "assessmentResultSection",
  "assessmentAnalysis",
  "program",
  "studyProgram",
  "libraryCategory",
  "storedFile",
  "libraryResource",
  "guideDocument",
  "consultationTopic",
  "specialistAvailability",
  "specialistBlockedDate",
  "appointment",
  "appointmentHistory",
  "notificationDelivery",
  "inAppNotification",
  "faqEntry",
  "unansweredQuestion",
  "setting",
  "auditLog",
  "pageView",
  "visitorDay",
] as const;

const BATCH = 500;

async function main() {
  const source = process.env.SOURCE_DATABASE_URL;
  // الهدف افتراضاً قاعدة Neon المضبوطة في .env، فلا يُلصق عنوانٌ مرتين.
  // المباشر لا المُجمَّع: النقل جلسةٌ طويلة، والمُجمِّع يقطعها.
  const target =
    process.env.TARGET_DATABASE_URL ||
    process.env.NEON_DATABASE_URL_UNPOOLED ||
    process.env.NEON_DATABASE_URL;

  if (!source || !target) {
    console.error(
      "\n✘ يلزم SOURCE_DATABASE_URL على الأقل.\n" +
        "  ضعه في ملف .env.migrate (مستثنى من المستودع):\n" +
        '    SOURCE_DATABASE_URL="<عنوان القاعدة القديمة>"\n' +
        "  والهدف يُقرأ من NEON_DATABASE_URL_UNPOOLED في .env، أو اضبط\n" +
        "  TARGET_DATABASE_URL صراحةً.\n"
    );
    process.exit(1);
  }
  if (source === target) {
    console.error("\n✘ المصدر والهدف قاعدةٌ واحدة.\n");
    process.exit(1);
  }

  const from = client(source);
  const to = client(target);

  console.log(`\n📦 نقل البيانات`);
  console.log(`   من : ${hostOf(source)}`);
  console.log(`   إلى: ${hostOf(target)}`);
  console.log(APPLY ? "   الوضع: تنفيذ\n" : "   الوضع: معاينة (أضف --apply للتنفيذ)\n");

  let totalRead = 0;
  let totalWritten = 0;

  for (const model of ORDER) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const src = (from as any)[model];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dst = (to as any)[model];
    if (!src || !dst) {
      console.log(`  ؟ ${model}: غير موجود في العميل — يُتخطّى`);
      continue;
    }

    const count: number = await src.count();
    const already: number = await dst.count();
    totalRead += count;

    if (count === 0) {
      console.log(`  · ${model}: فارغ`);
      continue;
    }
    if (already > 0) {
      console.log(`  ⏭ ${model}: في الهدف ${already} صفاً — يُترك كما هو`);
      continue;
    }
    if (!APPLY) {
      console.log(`  → ${model}: ${count} صفاً سيُنقل`);
      continue;
    }

    let moved = 0;
    for (let skip = 0; skip < count; skip += BATCH) {
      const rows = await src.findMany({ take: BATCH, skip });
      if (rows.length === 0) break;
      // skipDuplicates كي تُعاد المحاولة بلا ضرر إن انقطع النقل
      const res = await dst.createMany({ data: rows, skipDuplicates: true });
      moved += res.count ?? rows.length;
    }
    totalWritten += moved;
    console.log(`  ✔ ${model}: ${moved}/${count}`);
  }

  console.log(
    `\n${APPLY ? "✅ انتهى النقل" : "📋 المعاينة"}: قُرئ ${totalRead} صفاً، ` +
      `كُتب ${totalWritten}.\n`
  );
  if (APPLY) {
    console.log("الخطوة التالية: بدّل DATABASE_URL في Render إلى القاعدة الجديدة وأعد النشر.\n");
  }

  await from.$disconnect();
  await to.$disconnect();
}

main().catch(async (e) => {
  console.error("\n✘ فشل النقل:", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
