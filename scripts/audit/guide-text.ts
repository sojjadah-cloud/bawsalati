/**
 * مقابلة شروط البرامج بنصّ الدليل نفسه.
 *
 *   npm run audit:guide
 *
 * بيانات البرامج منقولة عن ملف إكسل، والإكسل يفقد نصّ الخانات المدموجة
 * (كما حدث في SQ203 صفحة 136). هذا السكربت يقرأ ملف الدليل PDF مباشرة
 * ويقارن كل صفحة بما عندنا من برامجها: أي مادةٍ أو نسبةٍ وردت في صفحة
 * الدليل ولم ترد في نصّ أي برنامج من برامجها تُعرض للمراجعة.
 *
 * المقارنة بالكلمة لا بالعبارة، لأنّ اسم المادة ينقسم على سطرين في
 * نصّنا («الرياضيات المتقدمة» ثم «أو الأساسية») فتضيع المطابقة الحرفية.
 *
 * الصفحات في ALLOWED رُوجعت بالعين وثبت أنّ ما زاد في الدليل ليس شرطاً:
 * نصّ تعريفي أو حسم تعادل أو قائمة تخصصات مستثناة.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const GUIDE = process.argv[2] ?? join(process.cwd(), "content", "StudentGuide2026.pdf");
const DATA = join(process.cwd(), "prisma", "seed-data", "study-programs.json");

/** صفحاتٌ رُوجعت: الزائد فيها نصٌّ تعريفي لا شرط. */
const ALLOWED = new Map<number, string>([
  [88, "نسبة في شرح البرنامج لا في شروطه"],
  [105, "قائمة التخصصات التي تغطيها بعثة STEM"],
  [106, "قائمة التخصصات المستثناة من بعثة ESAM"],
  [185, "فقرة برنامج التجسير التربوي"],
]);

/** الاستخراج يقلب «الإ» و«الآ» ويمطّ الحروف، فيُسوّى الطرفان قبل المقارنة. */
const fix = (s: string) =>
  s
    .replace(/ـ/gu, "")
    .replace(/اإل/gu, "الإ")
    .replace(/اآل/gu, "الآ")
    .replace(/األ/gu, "الأ")
    .replace(/[ً-ْٰ]/gu, "")
    .replace(/[إأآٱ]/gu, "ا")
    .replace(/[ةه]/gu, "ه")
    .replace(/ى/gu, "ي")
    .replace(/\s+/gu, " ");

/** كلمةٌ واحدة تميّز المادة ولا تلتبس باسم كلية أو مؤسسة. */
const WORDS: Record<string, string> = {
  المتقدمه: "الرياضيات المتقدمة",
  الاساسيه: "الرياضيات الأساسية",
  الفيزياء: "الفيزياء",
  الكيمياء: "الكيمياء",
  الاحياء: "الأحياء",
  الانجليزيه: "اللغة الإنجليزية",
  العربيه: "اللغة العربية",
  الاجتماعيه: "الدراسات الاجتماعية",
  الاسلاميه: "التربية الإسلامية",
  البيئيه: "العلوم البيئية",
  الجيولوجيا: "الجيولوجيا",
  الجغرافيا: "الجغرافيا الاقتصادية",
  الموسيقيه: "المهارات الموسيقية",
  الالمانيه: "اللغة الألمانية",
  الفرنسيه: "اللغة الفرنسية",
  الصينيه: "اللغة الصينية",
};

const percents = (s: string) =>
  new Set(s.match(/\d{2,3}(?=\s*[٪%])|(?<=[٪%]\s{0,3})\d{2,3}/gu) ?? []);

interface Row {
  code: string;
  name: string;
  requirements: string;
  tieBreakers: string;
  notes: string;
  page: number;
}

async function main() {
  if (!existsSync(GUIDE)) {
    console.log(`\n⏭  لا ملف دليل في ${GUIDE} — يُتخطّى الفحص.\n`);
    return;
  }
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(GUIDE)),
    disableFontFace: true,
    useSystemFonts: false,
  }).promise;

  const guide = new Map<number, string>();
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    guide.set(n, fix(content.items.map((i) => ("str" in i ? i.str : "")).join(" ")));
  }

  const { programs } = JSON.parse(readFileSync(DATA, "utf8")) as { programs: Row[] };
  const byPage = new Map<number, Row[]>();
  for (const p of programs) byPage.set(p.page, [...(byPage.get(p.page) ?? []), p]);

  let flagged = 0;
  let skipped = 0;
  for (const [page, rows] of [...byPage].sort((a, b) => a[0] - b[0])) {
    const pdf = guide.get(page);
    if (!pdf) {
      console.log(`  ⚠ ص${page}: ليست في ملف الدليل`);
      flagged++;
      continue;
    }
    const ours = fix(rows.map((r) => `${r.requirements}\n${r.tieBreakers}\n${r.notes}\n${r.name}`).join("\n"));
    const missWords = Object.keys(WORDS).filter((w) => pdf.includes(w) && !ours.includes(w));
    const ourPercents = percents(ours);
    const missPercents = [...percents(pdf)].filter((v) => !ourPercents.has(v));
    if (missWords.length === 0 && missPercents.length === 0) continue;
    if (ALLOWED.has(page)) {
      skipped++;
      continue;
    }
    flagged++;
    console.log(`\n  ⚠ ص${page} [${rows.map((r) => r.code).join(" ")}]`);
    if (missWords.length) console.log(`     مادة في الدليل وليست في نصّنا: ${missWords.map((w) => WORDS[w]).join("، ")}`);
    if (missPercents.length) console.log(`     نسبة في الدليل وليست في نصّنا: ${missPercents.join("، ")}`);
  }

  console.log(`\n📖 مقابلة الدليل — ${byPage.size} صفحة فيها برامج، ${programs.length} برنامجاً`);
  console.log(`  صفحات رُوجعت سابقاً وزائدها ليس شرطاً: ${skipped}`);
  console.log(flagged === 0 ? "\n✅ كل صفحة تطابق الدليل.\n" : `\n⚠️  ${flagged} صفحة تحتاج مراجعة.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
