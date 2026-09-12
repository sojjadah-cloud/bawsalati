// ═══════════════════════════════════════════════════════════════
// قراءة شروط القبول المكتوبة نثراً وتحويلها إلى شروط قابلة للفحص.
//
// نصّ الدليل مثل: «• الحصول على (90%) في الرياضيات المتقدمة أو الفيزياء.»
// يصير: { min: 90, anyOf: ["الرياضيات المتقدمة", "الفيزياء"], count: 1 }
//
// ما لا يُفهَم يبقى نصّاً ظاهراً للطالب ولا يُخمَّن، فالقبول لا يُبنى على تخمين.
// ═══════════════════════════════════════════════════════════════

import { SUBJECTS } from "@/lib/constants";

export { SUBJECTS };

export type Subject = (typeof SUBJECTS)[number];

/** صيغ أخرى تُكتب بها المادة نفسها في الدليل. */
const ALIASES: Record<string, Subject> = {
  "اللغة الانجليزية": "اللغة الإنجليزية",
  "الانجليزية": "اللغة الإنجليزية",
  "الإنجليزية": "اللغة الإنجليزية",
  "العربية": "اللغة العربية",
  "الرياضيات": "الرياضيات المتقدمة",
  "المتقدمة": "الرياضيات المتقدمة",
  "الأساسية": "الرياضيات الأساسية",
  "الاحياء": "الأحياء",
  "الدراسات الإجتماعية": "الدراسات الاجتماعية",
  "التربية الاسلامية": "التربية الإسلامية",
  "تقنية": "تقنية المعلومات",
  "هندسة": "الهندسة",
  "الرسم الهندسي": "الهندسة",
  "العلوم البيئية": "العلوم البيئية",
  "علوم بيئية": "العلوم البيئية",
  "البيئية": "العلوم البيئية",
  "الجغرافيا": "الجغرافيا الاقتصادية",
  "الجغرافيا الاقتصادية": "الجغرافيا الاقتصادية",
  "التاريخ": "التاريخ (الحضارة الإسلامية)",
  "الحضارة الإسلامية": "التاريخ (الحضارة الإسلامية)",
  "مهارات اللغة الإنجليزية": "مهارات اللغة الإنجليزية",
  "اللغة الالمانية": "اللغة الألمانية",
  "الالمانية": "اللغة الألمانية",
  "الفرنسية": "اللغة الفرنسية",
  "الصينية": "اللغة الصينية",
  "الرياضة المدرسية": "الرياضة المدرسية",
  "المهارات الموسيقية": "المهارات الموسيقية",
};

export interface SubjectRule {
  /** أدنى نسبة مطلوبة */
  min: number;
  /** المواد المقبولة لهذا الشرط — يكفي تحقّق العدد المطلوب منها */
  anyOf: Subject[];
  /** كم مادة من القائمة يجب أن تتحقّق. «مادتين من» تجعلها 2. */
  count: number;
}

export interface ParsedRequirements {
  /** أدنى معدل عام أو تقدير دبلوم التعليم العام */
  minOverall: number | null;
  rules: SubjectRule[];
  /** أسطر لم تُفهَم آلياً — تُعرض للطالب كما وردت */
  unparsed: string[];
}

const PERCENT = /\(?\s*(\d{2,3})(?:\.\d+)?\s*[%٪]\s*\)?/u;

function normalize(line: string): string {
  return line
    .replace(/[ً-ْٰـ]/gu, "")
    .replace(/[إأآٱ]/gu, "ا")
    .replace(/\s+/gu, " ")
    .trim();
}

/** يحوّل نصّ مادة (أو عدّة مواد يفصلها «أو») إلى مواد معروفة. */
export function readSubjects(text: string): Subject[] {
  // «أو» قد تصل مطبَّعة بلا همزة، والفصل يقبل الصيغتين
  const parts = text
    .split(/\s+(?:أو|او)\s+|\s*[/،,]\s*|\s+و\s+/u)
    .map((p) => p.replace(/[().:-]/gu, " ").trim())
    .filter(Boolean);

  const found: Subject[] = [];
  for (const part of parts) {
    const norm = normalize(part);
    const direct = SUBJECTS.find((s) => normalize(s) === norm);
    if (direct) {
      if (!found.includes(direct)) found.push(direct);
      continue;
    }
    const alias = Object.entries(ALIASES).find(([k]) => normalize(k) === norm);
    if (alias) {
      if (!found.includes(alias[1])) found.push(alias[1]);
      continue;
    }
    // احتواء: قد يحمل الجزء الواحد أكثر من مادة حين ينقطع السطر
    for (const s of SUBJECTS) {
      if (norm.includes(normalize(s)) && !found.includes(s)) found.push(s);
    }
    for (const [alias, subject] of Object.entries(ALIASES)) {
      if (norm.includes(normalize(alias)) && !found.includes(subject)) found.push(subject);
    }
  }
  return found;
}

/** أسطر لا تحمل شرطاً قابلاً للفحص: عبارات عامة أو إجرائية. */
const NOT_A_RULE =
  /اجتياز|مقابلة|مقابلات|اختبار قبول|فحص طبي|لياقة|يشترط الا|المفاضلة|حسم التعادل|لغة الدراسة|بلد الدراسة|المؤسسة التعليمية|يقتصر القبول|شهادة|السيرة|المقابلة/u;

export function parseRequirements(text: string): ParsedRequirements {
  const out: ParsedRequirements = { minOverall: null, rules: [], unparsed: [] };
  if (!text) return out;

  // نسبة معلنة تخصّ قائمة مواد تليها في أسطر مستقلّة
  let pendingMin: number | null = null;
  let pendingCount = 1;
  // آخر شرط أُنشئ من السطر السابق مباشرة، ليُوصَل به ما انقطع من سطره
  let lastRuleFromPreviousLine: SubjectRule | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.replace(/^[•\-\s]+/u, "").trim();
    if (!line) continue;
    const norm = normalize(line);
    const previousRule: SubjectRule | null = lastRuleFromPreviousLine;
    lastRuleFromPreviousLine = null;

    // المعدل العام: «معدل عام لا يقل عن (85%)» أو «دبلوم التعليم العام بتقدير (65%)»
    if (/معدل عام|دبلوم التعليم العام بتقدير|بتقدير عام/u.test(norm)) {
      const m = norm.match(PERCENT);
      if (m) {
        const value = Number(m[1]);
        out.minOverall = out.minOverall === null ? value : Math.max(out.minOverall, value);
        continue;
      }
    }

    if (/النجاح في دبلوم التعليم العام/u.test(norm) && !PERCENT.test(norm)) continue;

    const percent = norm.match(PERCENT);

    // «الحصول على (90%) في المواد الاتية:-» أو «(80%) كحد ادنى في مادتين من:»
    if (percent && /(المواد الاتيه|المواد الاتية|المواد التاليه|المواد|مادتين|كل منها)/u.test(norm)) {
      pendingMin = Number(percent[1]);
      pendingCount = /مادتين/u.test(norm) ? 2 : 1;
      const inline = readSubjects(norm.replace(PERCENT, " "));
      if (inline.length > 0 && !/الاتي|التالي|مادتين/u.test(norm)) {
        out.rules.push({ min: pendingMin, anyOf: inline, count: pendingCount });
        pendingMin = null;
        pendingCount = 1;
      }
      continue;
    }

    // «(90%) في الرياضيات المتقدمة أو الفيزياء»
    if (percent) {
      const after = norm.slice(norm.indexOf(percent[0]) + percent[0].length);
      const subjects = readSubjects(after.replace(/^\s*(كحد ادنى\s*)?في\s*/u, ""));
      if (subjects.length > 0) {
        const rule = { min: Number(percent[1]), anyOf: subjects, count: 1 };
        out.rules.push(rule);
        lastRuleFromPreviousLine = rule;
        continue;
      }
      // «الحصول على (55%) في :-» ترويسة لقائمة مواد تليها
      if (/[:：]-?\s*$/u.test(norm) || /^\s*$/u.test(after.trim())) {
        pendingMin = Number(percent[1]);
        pendingCount = 1;
        continue;
      }
      if (!NOT_A_RULE.test(norm)) out.unparsed.push(line);
      continue;
    }

    // بند قائمة يتبع نسبة معلنة قبله
    if (pendingMin !== null) {
      const subjects = readSubjects(norm);
      if (subjects.length > 0) {
        const rule = {
          min: pendingMin,
          anyOf: subjects,
          count: Math.min(pendingCount, subjects.length),
        };
        out.rules.push(rule);
        lastRuleFromPreviousLine = rule;
        continue;
      }
    }

    // سطر مقطوع عن سابقه: «... في الرياضيات» ثم «المتقدمة أو الأساسية»
    if (previousRule) {
      const subjects = readSubjects(norm);
      if (subjects.length > 0) {
        for (const s of subjects) if (!previousRule.anyOf.includes(s)) previousRule.anyOf.push(s);
        lastRuleFromPreviousLine = previousRule;
        continue;
      }
    }

    // ترويسة بلا نسبة ولا مواد: «الحصول على:-»
    if (/[:：]-?\s*$/u.test(norm)) continue;

    if (!NOT_A_RULE.test(norm)) out.unparsed.push(line);
  }

  return out;
}

/* ───────────────────────── مطابقة الطالب بالشروط ───────────────────────── */

export type Marks = Partial<Record<Subject, number>>;

export interface RuleCheck {
  rule: SubjectRule;
  met: boolean;
  /** المواد التي حقّقت الشرط فعلاً */
  matched: Subject[];
}

export interface Eligibility {
  eligible: boolean;
  overallMet: boolean;
  checks: RuleCheck[];
  /** مواد يشترطها البرنامج ولم يدرسها الطالب */
  missingSubjects: Subject[];
}

/** هل يفي الطالب بشروط البرنامج؟ الدرجات اختيارية لطالب لم تصدر نتائجه. */
export function checkEligibility(
  parsed: ParsedRequirements,
  marks: Marks,
  overall: number | null
): Eligibility {
  const studied = Object.keys(marks) as Subject[];

  const checks: RuleCheck[] = parsed.rules.map((rule) => {
    const matched = rule.anyOf.filter((s) => {
      const mark = marks[s];
      return mark !== undefined && mark >= rule.min;
    });
    return { rule, met: matched.length >= rule.count, matched };
  });

  const missingSubjects: Subject[] = [];
  for (const rule of parsed.rules) {
    if (rule.anyOf.some((s) => studied.includes(s))) continue;
    for (const s of rule.anyOf) if (!missingSubjects.includes(s)) missingSubjects.push(s);
  }

  const overallMet =
    parsed.minOverall === null || (overall !== null && overall >= parsed.minOverall);

  return {
    eligible: overallMet && checks.every((c) => c.met),
    overallMet,
    checks,
    missingSubjects,
  };
}

/** هل يستطيع طالب لم تصدر نتائجه دراسة هذا البرنامج بمواده الحالية؟ */
export function canStudyWith(parsed: ParsedRequirements, studied: Subject[]): boolean {
  return parsed.rules.every((rule) => {
    const available = rule.anyOf.filter((s) => studied.includes(s));
    return available.length >= rule.count;
  });
}

/**
 * المعدل التنافسي كما ينصّ عليه الدليل (صفحة 11):
 *   النتيجة 1 = معدل جميع المواد التي درسها الطالب × 0.4
 *   النتيجة 2 = معدل المواد المطلوبة للبرنامج × 0.6
 *   المعدل التنافسي = النتيجة 1 + النتيجة 2
 *
 * يعيد null إن لم يكن للبرنامج مواد مطلوبة معروفة، فلا يُحتسب بلا أساس.
 */
export const ALL_SUBJECTS_WEIGHT = 0.4;
export const PROGRAM_SUBJECTS_WEIGHT = 0.6;

export function competitiveAverage(
  parsed: ParsedRequirements,
  marks: Marks
): number | null {
  const all = Object.values(marks).filter((v): v is number => typeof v === "number");
  if (all.length === 0) return null;

  // مواد البرنامج: أفضل مادة محقّقة من كل شرط، فالشرط يتحقّق بواحدة منها
  const programMarks: number[] = [];
  for (const rule of parsed.rules) {
    const available = rule.anyOf
      .map((s) => marks[s])
      .filter((v): v is number => typeof v === "number")
      .sort((a, b) => b - a)
      .slice(0, rule.count);
    programMarks.push(...available);
  }
  if (programMarks.length === 0) return null;

  const avgAll = all.reduce((a, b) => a + b, 0) / all.length;
  const avgProgram = programMarks.reduce((a, b) => a + b, 0) / programMarks.length;

  return Math.round((avgAll * ALL_SUBJECTS_WEIGHT + avgProgram * PROGRAM_SUBJECTS_WEIGHT) * 100) / 100;
}
