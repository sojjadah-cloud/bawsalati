// ═══════════════════════════════════════════════════════════════
// محرّك التصحيح — يعمل في الخادم فقط ويقرأ قواعده من قاعدة البيانات.
//
// لا توجد أي قيمة منهجية مكتوبة في هذا الملف. القيم كلها في
// scoring_rule_sets / scoring_rules، وتُدار من لوحة المدير.
// المتصفّح لا يحسب نتيجة معتمدة إطلاقاً.
// ═══════════════════════════════════════════════════════════════

export interface ScoringDimension {
  id: string;
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
  /** رقم المجموعة 1..9 — يحدّد موضع الخلية داخل جدول النتيجة */
  groupNumber: number;
}

/** (بُعد، فئة صف، درجة خام) ← رتبة مئوية. */
export interface ScoringRuleRow {
  dimensionId: string;
  gradeBand: string;
  rawScore: number;
  percentile: number;
}

export interface ScoringInput {
  dimensions: ScoringDimension[];
  questions: ScoringQuestion[];
  rules: ScoringRuleRow[];
  method: string;
  gradeBand: string;
  /** questionId → القيمة المختارة */
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
  topDimensions: string[];
  recommendedFields: string[];
}

export class ScoringError extends Error {}

export const SUPPORTED_METHODS = ["SUM_THEN_PERCENTILE"] as const;

/**
 * SUM_THEN_PERCENTILE:
 *   الدرجة الخام لبُعد = مجموع قيم إجابات عباراته.
 *   الرتبة المئوية = القيمة المخزّنة لهذه الدرجة الخام ضمن فئة صف الطالب.
 * لا يوجد أي استنتاج أو تقريب أو توصية مولّدة خارج ما تنصّ عليه القواعد.
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

  const ruleIndex = new Map<string, number>();
  for (const r of input.rules) {
    if (r.gradeBand !== input.gradeBand) continue;
    ruleIndex.set(`${r.dimensionId}:${r.rawScore}`, r.percentile);
  }

  const sections: ResultSection[] = [];
  const analysis: AnalysisRow[] = [];

  const dimensions = [...input.dimensions].sort((a, b) => a.displayOrder - b.displayOrder);

  for (const dim of dimensions) {
    const questions = (byDimension.get(dim.id) ?? []).sort(
      (a, b) => a.groupNumber - b.groupNumber || a.number - b.number
    );

    let rawScore = 0;
    for (const q of questions) rawScore += input.answers.get(q.id) ?? 0;

    const percentile = ruleIndex.get(`${dim.id}:${rawScore}`);
    if (percentile === undefined) {
      throw new ScoringError(
        `لا توجد قاعدة تحويل للبُعد ${dim.code} عند الدرجة ${rawScore} لفئة الصف ${input.gradeBand}`
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

  // الترتيب حسب الرتبة المئوية، ثم الدرجة الخام عند التعادل.
  const ranked = [...analysis].sort(
    (a, b) => b.percentile - a.percentile || b.rawScore - a.rawScore
  );
  ranked.forEach((row, i) => {
    row.rank = i + 1;
  });

  const topDimensions = ranked.slice(0, 3).map((r) => r.code);
  const fieldsByCode = new Map(dimensions.map((d) => [d.code, d.fields]));
  const recommendedFields: string[] = [];
  for (const code of topDimensions) {
    for (const field of fieldsByCode.get(code) ?? []) {
      if (!recommendedFields.includes(field)) recommendedFields.push(field);
    }
  }

  return { sections, analysis, topDimensions, recommendedFields };
}

/** ترتيب عبارات البُعد التسع في شبكة 3×3 حسب رقم المجموعة. */
function toGrid(questions: ScoringQuestion[], answers: Map<string, number>): ResultCell[][] {
  const grid: ResultCell[][] = [[], [], []];
  questions.forEach((q, index) => {
    const row = Math.floor(index / 3);
    if (row > 2) return;
    grid[row].push({
      questionNumber: q.number,
      text: q.text,
      value: answers.get(q.id) ?? 0,
    });
  });
  return grid;
}

/** فئة الصف المستخدمة في جدول التحويل. */
export function gradeBandOf(grade: string, available: string[]): string {
  if (available.includes(grade)) return grade;
  throw new ScoringError(`لا توجد قواعد تحويل للصف ${grade}`);
}
