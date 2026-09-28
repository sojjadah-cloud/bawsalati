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
    const named = SUBJECTS.filter((s) => p.requirements.includes(s));
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

console.log(`\n📋 فحص قراءة الشروط — ${programs.length} برنامجاً\n`);
console.log(`  بلا شرط مواد مقروء: ${noRules}`);
console.log(`  أسطر أفلتت من القراءة وفيها مادة أو نسبة: ${missed.length}`);
console.log(`  برامج بلا شرط مع ذكر مادة في نصّها: ${emptyWithSubjects.length}`);
console.log(`  مواد ذُكرت ولم ترد في أي شرط: ${droppedSubjects.length}\n`);

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

const clean = missed.length === 0 && emptyWithSubjects.length === 0 && droppedSubjects.length === 0;
console.log(clean ? "\n✅ كل شرطٍ مذكورٍ مقروء.\n" : "\n⚠️  راجع ما سبق في الدليل.\n");
process.exit(clean ? 0 : 1);
