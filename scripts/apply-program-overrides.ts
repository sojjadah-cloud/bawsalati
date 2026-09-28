/**
 * تطبيق تصحيحات الدليل على ملف البرامج.
 *
 *   npm run programs:overrides
 *
 * التصحيحات في prisma/seed-data/program-overrides.json، كلٌّ بصفحته وسببه،
 * وتُطبَّق أصلاً عند تحويل ملف الإكسل (scripts/xlsx-to-programs.py). هذا
 * السكربت يطبّقها على study-programs.json مباشرةً حين يُصحَّح شيءٌ بعد
 * التحويل، فلا يُنتظر ملف المصدر. آمن عند التكرار: ما طُبِّق لا يُعاد.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface Override {
  code: string;
  page: number;
  why: string;
  name?: string;
  requirements?: string;
  institution?: string;
}

/** الحقول التي يصحّحها ملف التصحيحات. */
const FIELDS = ["name", "requirements", "institution"] as const;

const dir = join(process.cwd(), "prisma", "seed-data");
const programsFile = join(dir, "study-programs.json");

const payload = JSON.parse(readFileSync(programsFile, "utf8")) as {
  programs: Record<string, string>[];
};
const { overrides } = JSON.parse(readFileSync(join(dir, "program-overrides.json"), "utf8")) as {
  overrides: Override[];
};

const byCode = new Map(payload.programs.map((p) => [p.code, p]));
let changed = 0;
const missing: string[] = [];

for (const o of overrides) {
  const program = byCode.get(o.code);
  if (!program) {
    missing.push(o.code);
    continue;
  }
  let touched = false;
  for (const field of FIELDS) {
    const value = o[field];
    // القيمة الفارغة تصحيحٌ أيضاً: خانةٌ حملت نصّاً ليس من بابها
    if (value === undefined || program[field] === value) continue;
    program[field] = value;
    touched = true;
  }
  if (touched) {
    changed++;
    console.log(`  ✎ ${o.code} ص${o.page} — ${o.why}`);
  }
}

if (changed > 0) writeFileSync(programsFile, JSON.stringify(payload, null, 2) + "\n", "utf8");

console.log(`\n  التصحيحات: ${overrides.length}، المطبَّق الآن: ${changed}`);
if (missing.length > 0) console.log(`  ⚠️  رموز لا وجود لها في الملف: ${missing.join("، ")}`);
console.log(changed > 0 ? "  شغّل npm run programs:import ليصل التصحيح إلى القاعدة.\n" : "  لا جديد.\n");
