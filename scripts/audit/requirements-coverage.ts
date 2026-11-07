/**
 * فحص تغطية قراءة الشروط.
 *
 *   npm run audit:rules
 *
 * «اعرف تخصصك» لا يعرض برنامجاً إلا إن تحقّقت شروطه المقروءة. فإن أفلت
 * شرطٌ من القراءة ظهر البرنامج لمن لا يستحقّه — وهذا أسوأ من ألّا يظهر.
 * هذا السكربت يقرأ نصّ الشروط كما في الدليل ويُظهر:
 *   1. أسطراً فيها مادة أو نسبة ولم تصر شرطاً (شرط أفلت).
 *   2. برامج لا شرط مواد لها مع ذكر مادة في نصّها.
 *   3. مواد ذُكرت في النصّ ولم ترد في أي شرط.
 *   4. خلايا الدليل المدموجة: صفٌّ جاء شرطه أقصر بكثير من إخوته في الصفحة
 *      نفسها وبلا شرط مواد — علامةُ أنّ نصّ الخانة المشتركة ضاع عند النقل.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRequirements, readSubjects, SUBJECTS } from "../../src/features/programs/requirements";

interface Row {
  code: string;
  name: string;
  field: string;
  requirements: string;
  page: number | null;
}

const file = process.argv[2] ?? join(process.cwd(), "prisma", "seed-data", "study-programs.json");
const { programs } = JSON.parse(readFileSync(file, "utf8")) as { programs: Row[] };

const missed: { code: string; page: number | null; line: string; subjects: string[] }[] = [];
const emptyWithSubjects: { code: string; name: string; subjects: string[] }[] = [];
const droppedSubjects: { code: string; page: number | null; subjects: string[] }[] = [];
let noRules = 0;

for (const p of programs) {
  const parsed = parseRequirements(p.requirements);
  const inRules = new Set(parsed.rules.flatMap((r) => r.anyOf));

  if (parsed.rules.length === 0) {
    noRules++;
    const named = SUBJECTS.filter((s) => p.requirements.includes(s));
    if (named.length > 0) {
      emptyWithSubjects.push({ code: p.code, name: p.name.slice(0, 50), subjects: named });
    }
  } else {
    // ذِكرُ «اللغة الإنجليزية» في سطر آيلتس شرطُ اختبارٍ عالمي لا شرطُ مادة
    // مدرسية، فلا يُحسب نقصاً حين لا يدخل في القواعد.
    const schoolLines = p.requirements
      .split("\n")
      .filter((l) => !/IELTS|TOEFL|ايلتس|توفل/iu.test(l))
      .join("\n");
    const named = SUBJECTS.filter((s) => schoolLines.includes(s));
    const dropped = named.filter((s) => !inRules.has(s));
    if (dropped.length > 0) {
      droppedSubjects.push({ code: p.code, page: p.page, subjects: dropped });
    }
  }

  for (const line of parsed.unparsed) {
    // شرط اختبار لغة عالمي لا يُقاس بدرجات المدرسة، يبقى نصّاً للطالب
    if (/IELTS|TOEFL|ايلتس|توفل/iu.test(line)) continue;
    const subjects = readSubjects(line);
    if (subjects.length > 0 || /\d{2}\s*[%٪]/u.test(line)) {
      missed.push({ code: p.code, page: p.page, line, subjects });
    }
  }
}

/**
 * خلايا الدليل المدموجة. هذه الرموز رُوجعت في ملف الدليل نفسه وثبت أنّ
 * شرطها قصيرٌ حقاً لا ناقصاً: صفحة 237 لـBS276 وBS277، و239 لـDS012 وDS013،
 * و107 لـDS020. ما عداها يُعرض للمراجعة.
 */
const VERIFIED_SHORT = new Set([
  // شرطها في الدليل قصيرٌ حقاً لا ناقصاً — رُوجعت صفحةً صفحة:
  "BS276", "BS277",   // ص237
  "DS012", "DS013",   // ص239
  "DS020",            // ص107
  "BS282", "BS273",   // ص176 — التربية الفنية والرياضية: دبلوم ومادة واحدة
  "BS315",            // ص180 — التربية الفنية: دبلوم والفنون التشكيلية
  "IG007",            // ص132 — صفّ فئة الضمان الاجتماعي
]);

const byPage = new Map<number, Row[]>();
for (const p of programs) {
  if (p.page === null) continue;
  byPage.set(p.page, [...(byPage.get(p.page) ?? []), p]);
}

const mergedCells: { code: string; page: number | null; name: string; own: string }[] = [];
for (const list of byPage.values()) {
  if (list.length < 2) continue;
  const longest = Math.max(...list.map((p) => (p.requirements ?? "").length));
  if (longest < 60) continue;
  // أكثر ما قُرئ من شروط مواد في هذه الصفحة — مقياسُ ما تحمله خانتها
  const richest = Math.max(...list.map((p) => parseRequirements(p.requirements ?? "").rules.length));
  for (const p of list) {
    if (VERIFIED_SHORT.has(p.code)) continue;
    const own = p.requirements ?? "";
    const mine = parseRequirements(own).rules.length;

    // خانةٌ ضاع نصّها كلّه: أقصر من ثلث أطول شرطٍ في الصفحة وبلا أي شرط
    const empty = own.length < longest / 3 && mine === 0;

    // أو ضاع بعضه: أقصر من نصف أطول شرط، وشروطه أقلّ من نصف ما لإخوته.
    // هكذا ضاعت مواد SQ159 وSQ162 في صفحة 115 — بقي لهما شرطٌ واحد
    // فأفلتا من الفحص الأول، وهما في خانةٍ مدموجة مع من قبلهما.
    const partial = richest >= 3 && mine > 0 && mine * 2 <= richest && own.length < longest / 2;

    if (!empty && !partial) continue;
    mergedCells.push({ code: p.code, page: p.page, name: p.name.slice(0, 44), own });
  }
}

console.log(`\n📋 فحص قراءة الشروط — ${programs.length} برنامجاً\n`);
console.log(`  خلايا مشتبهٌ بأنّ نصّها ضاع عند النقل: ${mergedCells.length}`);
console.log(`  بلا شرط مواد مقروء: ${noRules}`);
console.log(`  أسطر أفلتت من القراءة وفيها مادة أو نسبة: ${missed.length}`);
console.log(`  برامج بلا شرط مع ذكر مادة في نصّها: ${emptyWithSubjects.length}`);
console.log(`  مواد ذُكرت ولم ترد في أي شرط: ${droppedSubjects.length}\n`);

if (mergedCells.length > 0) {
  console.log("── خلايا يُرجَّح أنّ نصّها ضاع (راجعها في الدليل) ──");
  for (const m of mergedCells) {
    console.log(`  ${m.code} ص${m.page} ${m.name}`);
    console.log(`     له وحده: ${JSON.stringify(m.own)}`);
  }
  console.log();
}

if (missed.length > 0) {
  console.log("── أسطر أفلتت ──");
  for (const m of missed) {
    console.log(`  ${m.code} ص${m.page}: ${m.line}  → ${m.subjects.join("، ") || "—"}`);
  }
}

if (emptyWithSubjects.length > 0) {
  console.log("\n── بلا شرط مع ذكر مادة ──");
  for (const e of emptyWithSubjects) {
    console.log(`  ${e.code} | ${e.name} → ${e.subjects.join("، ")}`);
  }
}

if (droppedSubjects.length > 0) {
  console.log("\n── مواد ذُكرت ولم تدخل أي شرط ──");
  for (const d of droppedSubjects) {
    console.log(`  ${d.code} ص${d.page} → ${d.subjects.join("، ")}`);
  }
}

const clean =
  missed.length === 0 &&
  emptyWithSubjects.length === 0 &&
  droppedSubjects.length === 0 &&
  mergedCells.length === 0;
console.log(clean ? "\n✅ كل شرطٍ مذكورٍ مقروء.\n" : "\n⚠️  راجع ما سبق في الدليل.\n");
process.exit(clean ? 0 : 1);
