// ═══════════════════════════════════════════════════════════════
// اشتقاق الجداول المعيارية من نتائج الطلبة أنفسهم.
//
// الرتبة المئينية تعريفها إحصائي لا اجتهادي: نسبة من هم دون الطالب
// في مجموعته المرجعية. والدليل ينصّ على أن المجموعة المرجعية تُحدَّد
// بالصف والجنس معاً، فتُبنى لكل (بيئة، صف، جنس) على حدة.
//
// لا شيء هنا يخترع قيمة: ما لا تكفي عيّنته يبقى بلا اعتماد.
// ═══════════════════════════════════════════════════════════════

/** أدنى عدد طلاب في الخلية الواحدة قبل اعتماد رتبها. */
export const MIN_SAMPLE = 30;

/** أعلى درجة خام ممكنة: تسع عبارات لكل بيئة. */
export const MAX_RAW = 9;

export interface Observation {
  gradeBand: string;
  gender: string;
  dimensionId: string;
  rawScore: number;
}

export interface NormCell {
  dimensionId: string;
  gradeBand: string;
  gender: string;
  rawScore: number;
  percentile: number;
}

export interface NormGroup {
  dimensionId: string;
  gradeBand: string;
  gender: string;
  sample: number;
  /** true حين بلغت العيّنة الحدّ الأدنى فاعتُمدت رتبها */
  accepted: boolean;
  cells: NormCell[];
}

/**
 * الرتبة المئينية بصيغة نقطة المنتصف، وهي الصيغة المتعارف عليها في
 * تقنين المقاييس: نسبة من هم دون الدرجة، مضافاً إليها نصف من هم عندها.
 *
 *   PR = ((عدد الأقل) + 0.5 × (عدد المساوي)) ÷ الكل × 100
 *
 * نصف المساوين يُحسب لأن الدرجة الخام فئة لا نقطة: من حصل عليها يقع
 * داخل الفئة لا فوقها ولا تحتها.
 *
 * تُحصر النتيجة بين 1 و99 لأن الرتبة المئينية لا تبلغ الصفر ولا المئة:
 * لا أحد أدنى من الجميع ولا أعلى من الجميع في عيّنة محدودة.
 */
export function percentileRank(counts: number[], rawScore: number): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) throw new Error("لا توجد ملاحظات في هذه الخلية");

  let below = 0;
  for (let i = 0; i < rawScore; i++) below += counts[i] ?? 0;
  const at = counts[rawScore] ?? 0;

  const pr = ((below + at / 2) / total) * 100;
  return Math.min(99, Math.max(1, Math.round(pr)));
}

/** يبني جداول (بيئة، صف، جنس) من ملاحظات الطلبة. */
export function buildNorms(
  observations: Observation[],
  minSample: number = MIN_SAMPLE
): NormGroup[] {
  const groups = new Map<string, { key: Omit<NormGroup, "cells" | "sample" | "accepted">; counts: number[] }>();

  for (const o of observations) {
    if (!Number.isInteger(o.rawScore) || o.rawScore < 0 || o.rawScore > MAX_RAW) continue;
    const id = `${o.dimensionId}|${o.gradeBand}|${o.gender}`;
    const entry =
      groups.get(id) ??
      {
        key: { dimensionId: o.dimensionId, gradeBand: o.gradeBand, gender: o.gender },
        counts: Array.from({ length: MAX_RAW + 1 }, () => 0),
      };
    entry.counts[o.rawScore] += 1;
    groups.set(id, entry);
  }

  return [...groups.values()].map(({ key, counts }) => {
    const sample = counts.reduce((a, b) => a + b, 0);
    const accepted = sample >= minSample;
    return {
      ...key,
      sample,
      accepted,
      cells: accepted
        ? Array.from({ length: MAX_RAW + 1 }, (_, raw) => ({
            ...key,
            rawScore: raw,
            percentile: percentileRank(counts, raw),
          }))
        : [],
    };
  });
}

/** التغطية الكاملة: ست بيئات × أربعة صفوف × جنسان × عشر درجات. */
export function expectedCellCount(dimensions: number, gradeBands: number, genders: number): number {
  return dimensions * gradeBands * genders * (MAX_RAW + 1);
}
