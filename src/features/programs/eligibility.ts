// ═══════════════════════════════════════════════════════════════
// «أي تخصص أستطيع دخوله؟» — مطابقة الطالب ببرامج الدليل.
//
// طالب الصفّ العاشر يختار مواده فتظهر له المجالات التي تفتحها.
// وطالب الحادي عشر والثاني عشر يدخل درجاته فيُحتسب معدّله التنافسي
// لكل برنامج كما ينصّ الدليل، ويُعرض ما يستوفي شروطه.
// ═══════════════════════════════════════════════════════════════
import { prisma } from "@/lib/prisma";
import {
  checkEligibility,
  canStudyWith,
  competitiveAverage,
  SUBJECTS,
  type Marks,
  type ParsedRequirements,
  type Subject,
  type SubjectRule,
} from "./requirements";

export interface MatchInput {
  grade: string;
  /** المواد التي يدرسها الطالب */
  subjects: Subject[];
  /** الدرجات — للصفّين الحادي عشر والثاني عشر */
  marks?: Marks;
}

export interface ProgramMatch {
  id: string;
  code: string;
  name: string;
  field: string;
  programType: string;
  institution: string;
  country: string;
  guidePage: number | null;
  minOverall: number | null;
  /** المعدل التنافسي لهذا البرنامج بدرجات الطالب */
  competitive: number | null;
  /** شروط لم يستوفها الطالب، تُعرض ليعرف ما ينقصه */
  unmetRules: SubjectRule[];
  /** هل بلغ معدّله العام الحدّ الأدنى للبرنامج؟ */
  overallMet: boolean;
  eligible: boolean;
}

export interface MatchResult {
  /** يستوفي شروطه بالكامل */
  eligible: ProgramMatch[];
  /** قريب: مواده تكفي لكن درجة أو أكثر دون المطلوب */
  nearMisses: ProgramMatch[];
  /** المجالات التي تفتحها مواد الطالب، بعدد برامجها */
  fields: { field: string; count: number }[];
  overall: number | null;
  /** برامج لم تُقرأ شروطها آلياً فلا يُحكم عليها */
  unchecked: number;
}

const SELECT = {
  id: true,
  code: true,
  name: true,
  field: true,
  programType: true,
  institution: true,
  country: true,
  guidePage: true,
  minOverall: true,
  subjectRules: true,
} as const;

function toParsed(row: { minOverall: number | null; subjectRules: unknown }): ParsedRequirements {
  const rules = Array.isArray(row.subjectRules) ? (row.subjectRules as SubjectRule[]) : [];
  return { minOverall: row.minOverall, rules, unparsed: [] };
}

/** متوسّط درجات الطالب في كل المواد التي أدخلها. */
export function overallAverage(marks: Marks): number | null {
  const values = Object.values(marks).filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export async function matchPrograms(input: MatchInput): Promise<MatchResult> {
  const rows = await prisma.studyProgram.findMany({
    where: { active: true },
    select: SELECT,
    orderBy: { code: "asc" },
  });

  const marks = input.marks ?? {};
  const hasMarks = Object.keys(marks).length > 0;
  const overall = hasMarks ? overallAverage(marks) : null;
  const studied = hasMarks ? (Object.keys(marks) as Subject[]) : input.subjects;

  const eligible: ProgramMatch[] = [];
  const nearMisses: ProgramMatch[] = [];
  const fieldCount = new Map<string, number>();
  let unchecked = 0;

  for (const row of rows) {
    const parsed = toParsed(row);

    // بلا شروط مقروءة لا يصحّ الحكم بقبول ولا برفض
    if (parsed.rules.length === 0 && parsed.minOverall === null) {
      unchecked++;
      continue;
    }

    const base = {
      id: row.id,
      code: row.code,
      name: row.name,
      field: row.field,
      programType: row.programType,
      institution: row.institution,
      country: row.country,
      guidePage: row.guidePage,
      minOverall: row.minOverall,
    };

    if (!hasMarks) {
      // بلا درجات: يكفي أن تكون مواده تسمح بالشرط
      if (canStudyWith(parsed, studied)) {
        eligible.push({
          ...base,
          competitive: null,
          unmetRules: [],
          overallMet: true,
          eligible: true,
        });
        fieldCount.set(row.field, (fieldCount.get(row.field) ?? 0) + 1);
      }
      continue;
    }

    const check = checkEligibility(parsed, marks, overall);
    const competitive = competitiveAverage(parsed, marks);
    const unmetRules = check.checks.filter((c) => !c.met).map((c) => c.rule);
    const entry = {
      ...base,
      competitive,
      unmetRules,
      overallMet: check.overallMet,
      eligible: check.eligible,
    };

    if (check.eligible) {
      eligible.push(entry);
      fieldCount.set(row.field, (fieldCount.get(row.field) ?? 0) + 1);
    } else if (check.missingSubjects.length === 0) {
      // يدرس المواد المطلوبة لكن درجته دونها — قريب لا بعيد
      nearMisses.push(entry);
    }
  }

  eligible.sort((a, b) => (b.competitive ?? 0) - (a.competitive ?? 0) || a.code.localeCompare(b.code));
  nearMisses.sort((a, b) => (b.competitive ?? 0) - (a.competitive ?? 0));

  return {
    eligible,
    nearMisses: nearMisses.slice(0, 12),
    fields: [...fieldCount.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count),
    overall,
    unchecked,
  };
}

export { SUBJECTS };
export type { Subject, Marks };
