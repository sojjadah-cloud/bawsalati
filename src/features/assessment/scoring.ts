// ═══════════════════════════════════════════════════════════════
// محرّك تصحيح مقياس الميول المهنية — يعمل في الخادم فقط.
//
// لا توجد أي قيمة منهجية مكتوبة في هذا الملف. العبارات وتوزيعها على
// البيئات في قاعدة البيانات، والجداول المعيارية في scoring_rules،
// وكلاهما يأتي من دليل الطالب الرسمي. المتصفّح لا يحسب نتيجة معتمدة.
// ═══════════════════════════════════════════════════════════════

export interface ScoringDimension {
  id: string;
  /** الرمز كما في الدليل: و س ف ا م ت */
  code: string;
  label: string;
  description: string;
  color: string;
  fields: string[];
  displayOrder: number;
}

export interface ScoringQuestion {
  id: string;
  number: number;
  text: string;
  dimensionId: string;
}

/** خلية من الجدول المعياري: (بيئة، صف، نوع، درجة خام) ← رتبة مئينية. */
export interface ScoringRuleRow {
  dimensionId: string;
  gradeBand: string;
  gender: string;
  rawScore: number;
  percentile: number;
}

export interface ScoringInput {
  dimensions: ScoringDimension[];
  questions: ScoringQuestion[];
  rules: ScoringRuleRow[];
  method: string;
  gradeBand: string;
  gender: string;
  /** questionId → القيمة المختارة (1 = أفضّل هذا النشاط) */
  answers: Map<string, number>;
}

export interface ResultCell {
  questionNumber: number;
  text: string;
  value: number;
}

export interface ResultSection {
  dimensionCode: string;
  dimensionLabel: string;
  displayOrder: number;
  rawScore: number;
  percentile: number;
  /** شبكة 3 صفوف × 3 أعمدة */
  cells: ResultCell[][];
}

export interface AnalysisRow {
  code: string;
  label: string;
  rawScore: number;
  percentile: number;
  rank: number;
}

export interface ScoredResult {
  sections: ResultSection[];
  analysis: AnalysisRow[];
  /** رموز البيئات الثلاث الأعلى بالترتيب */
  topDimensions: string[];
  /** رمز الميول كما يُكتب في الدليل، مثل «و - ا - ت» */
  interestCode: string;
  recommendedFields: string[];
}

export class ScoringError extends Error {}

export const SUPPORTED_METHODS = ["COUNT_PREFERRED_THEN_PERCENTILE"] as const;

/**
 * COUNT_PREFERRED_THEN_PERCENTILE — الطريقة التي ينصّ عليها الدليل:
 *   الدرجة الخام لبيئة = عدد العبارات التي اختار فيها الطالب «أفضّل» (0..9).
 *   الرتبة المئينية = القيمة المخزّنة لتلك الدرجة في جدول صفّه ونوعه.
 *   رمز الميول = رموز البيئات الثلاث الأعلى رتبةً مئينية.
 *
 * لا استنتاج ولا تقريب ولا توصية مولّدة خارج ما تنصّ عليه الجداول.
 */
export function scoreAssessment(input: ScoringInput): ScoredResult {
  if (!SUPPORTED_METHODS.includes(input.method as (typeof SUPPORTED_METHODS)[number])) {
    throw new ScoringError(`طريقة تصحيح غير مدعومة: ${input.method}`);
  }

  const byDimension = new Map<string, ScoringQuestion[]>();
  for (const q of input.questions) {
    const list = byDimension.get(q.dimensionId) ?? [];
    list.push(q);
    byDimension.set(q.dimensionId, list);
  }

  // الجدول المعياري الخاص بصفّ الطالب ونوعه وحده.
  const ruleIndex = new Map<string, number>();
  for (const r of input.rules) {
    if (r.gradeBand !== input.gradeBand || r.gender !== input.gender) continue;
    ruleIndex.set(`${r.dimensionId}:${r.rawScore}`, r.percentile);
  }

  const sections: ResultSection[] = [];
  const analysis: AnalysisRow[] = [];

  const dimensions = [...input.dimensions].sort((a, b) => a.displayOrder - b.displayOrder);

  for (const dim of dimensions) {
    // ترتيب العبارات برقمها هو ترتيب الدليل نفسه.
    const questions = (byDimension.get(dim.id) ?? []).sort((a, b) => a.number - b.number);

    // الدرجة الخام = عدد الإجابات الموجبة، لا مجموع قيم عشوائية.
    let rawScore = 0;
    for (const q of questions) {
      if ((input.answers.get(q.id) ?? 0) > 0) rawScore += 1;
    }

    const percentile = ruleIndex.get(`${dim.id}:${rawScore}`);
    if (percentile === undefined) {
      throw new ScoringError(
        `لا يوجد جدول معياري للبيئة ${dim.code} عند الدرجة ${rawScore} للصف ${input.gradeBand}`
      );
    }

    sections.push({
      dimensionCode: dim.code,
      dimensionLabel: dim.label,
      displayOrder: dim.displayOrder,
      rawScore,
      percentile,
      cells: toGrid(questions, input.answers),
    });

    analysis.push({ code: dim.code, label: dim.label, rawScore, percentile, rank: 0 });
  }

  // الترتيب بالرتبة المئينية، وعند التعادل بالدرجة الخام.
  const ranked = [...analysis].sort(
    (a, b) => b.percentile - a.percentile || b.rawScore - a.rawScore
  );
  ranked.forEach((row, i) => {
    row.rank = i + 1;
  });

  const topDimensions = ranked.slice(0, 3).map((r) => r.code);
  const interestCode = topDimensions.join(" - ");

  const fieldsByCode = new Map(dimensions.map((d) => [d.code, d.fields]));
  const recommendedFields: string[] = [];
  for (const code of topDimensions) {
    for (const field of fieldsByCode.get(code) ?? []) {
      if (!recommendedFields.includes(field)) recommendedFields.push(field);
    }
  }

  return { sections, analysis, topDimensions, interestCode, recommendedFields };
}

/** عبارات البيئة التسع في شبكة 3×3، بترتيب أرقامها. */
function toGrid(questions: ScoringQuestion[], answers: Map<string, number>): ResultCell[][] {
  const grid: ResultCell[][] = [[], [], []];
  questions.forEach((q, index) => {
    const row = Math.floor(index / 3);
    if (row > 2) return;
    grid[row].push({
      questionNumber: q.number,
      text: q.text,
      value: (answers.get(q.id) ?? 0) > 0 ? 1 : 0,
    });
  });
  return grid;
}

/** الصف المستخدم في الجدول المعياري. */
export function gradeBandOf(grade: string, available: string[]): string {
  if (available.includes(grade)) return grade;
  throw new ScoringError(`لا يوجد جدول معياري للصف ${grade}`);
}
