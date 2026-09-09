import { describe, expect, it } from "vitest";
import {
  scoreAssessment,
  gradeBandOf,
  ScoringError,
  type ScoringDimension,
  type ScoringQuestion,
  type ScoringRuleRow,
} from "@/features/assessment/scoring";

/** ستة محاور، تسع عبارات لكل محور، موزّعة على تسع مجموعات. */
const DIMENSIONS: ScoringDimension[] = ["R", "I", "A", "S", "E", "C"].map((code, i) => ({
  id: `dim-${code}`,
  code,
  label: `محور ${code}`,
  description: `وصف ${code}`,
  color: "#000000",
  fields: [`مجال ${code}`, "مجال مشترك"],
  displayOrder: i + 1,
}));

const QUESTIONS: ScoringQuestion[] = [];
for (let group = 1; group <= 9; group++) {
  DIMENSIONS.forEach((dim, i) => {
    const number = (group - 1) * 6 + i + 1;
    QUESTIONS.push({
      id: `q-${number}`,
      number,
      text: `عبارة ${number}`,
      dimensionId: dim.id,
      groupNumber: group,
    });
  });
}

/** جدول تحويل صناعي للاختبار: الرتبة = الدرجة الخام × 11. */
const RULES: ScoringRuleRow[] = DIMENSIONS.flatMap((dim) =>
  Array.from({ length: 10 }, (_, raw) => ({
    dimensionId: dim.id,
    gradeBand: "11",
    rawScore: raw,
    percentile: raw * 11,
  }))
);

function answersFor(pattern: (q: ScoringQuestion) => number): Map<string, number> {
  return new Map(QUESTIONS.map((q) => [q.id, pattern(q)]));
}

const base = {
  dimensions: DIMENSIONS,
  questions: QUESTIONS,
  rules: RULES,
  method: "SUM_THEN_PERCENTILE",
  gradeBand: "11",
};

describe("بنية المقياس", () => {
  it("يتكوّن من 54 عبارة في 9 مجموعات × 6", () => {
    expect(QUESTIONS).toHaveLength(54);
    const groups = new Set(QUESTIONS.map((q) => q.groupNumber));
    expect(groups.size).toBe(9);
    for (const g of groups) {
      expect(QUESTIONS.filter((q) => q.groupNumber === g)).toHaveLength(6);
    }
  });

  it("يبدأ بالعبارة 1 وينتهي بالعبارة 54", () => {
    const numbers = QUESTIONS.map((q) => q.number).sort((a, b) => a - b);
    expect(numbers[0]).toBe(1);
    expect(numbers[numbers.length - 1]).toBe(54);
  });
});

describe("محرّك التصحيح", () => {
  it("يبني ستة جداول نتيجة، كل جدول 3 صفوف × 3 أعمدة", () => {
    const result = scoreAssessment({ ...base, answers: answersFor(() => 1) });
    expect(result.sections).toHaveLength(6);
    for (const section of result.sections) {
      expect(section.cells).toHaveLength(3);
      for (const row of section.cells) expect(row).toHaveLength(3);
      expect(section.cells.flat()).toHaveLength(9);
    }
  });

  it("يحسب الدرجة الخام كمجموع إجابات المحور", () => {
    // المحور R فقط تنطبق عليه كل العبارات
    const result = scoreAssessment({
      ...base,
      answers: answersFor((q) => (q.dimensionId === "dim-R" ? 1 : 0)),
    });
    const r = result.sections.find((s) => s.dimensionCode === "R");
    const i = result.sections.find((s) => s.dimensionCode === "I");
    expect(r?.rawScore).toBe(9);
    expect(i?.rawScore).toBe(0);
  });

  it("يحوّل الدرجة الخام إلى رتبة مئوية من القواعد المخزّنة فقط", () => {
    const result = scoreAssessment({
      ...base,
      answers: answersFor((q) => (q.dimensionId === "dim-R" && q.groupNumber <= 4 ? 1 : 0)),
    });
    const r = result.sections.find((s) => s.dimensionCode === "R");
    expect(r?.rawScore).toBe(4);
    expect(r?.percentile).toBe(44); // 4 × 11 حسب جدول الاختبار
  });

  it("يرتّب المحاور تنازلياً ويعيد الثلاثة الأعلى", () => {
    const strong = new Set(["dim-I", "dim-S"]);
    const result = scoreAssessment({
      ...base,
      answers: answersFor((q) =>
        strong.has(q.dimensionId) ? 1 : q.dimensionId === "dim-R" && q.groupNumber <= 5 ? 1 : 0
      ),
    });
    expect(result.analysis).toHaveLength(6);
    expect(result.analysis.map((a) => a.rank).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.topDimensions).toHaveLength(3);
    expect(result.topDimensions.slice(0, 2).sort()).toEqual(["I", "S"]);
    expect(result.topDimensions[2]).toBe("R");
  });

  it("يجمع مجالات المحاور الثلاثة الأعلى بلا تكرار", () => {
    const result = scoreAssessment({
      ...base,
      answers: answersFor((q) => (q.dimensionId === "dim-R" ? 1 : 0)),
    });
    const unique = new Set(result.recommendedFields);
    expect(unique.size).toBe(result.recommendedFields.length);
    expect(result.recommendedFields).toContain("مجال R");
  });

  it("يضع العبارات في الشبكة بترتيب المجموعات", () => {
    const result = scoreAssessment({ ...base, answers: answersFor(() => 0) });
    const r = result.sections.find((s) => s.dimensionCode === "R");
    // المحور R هو الأول في كل مجموعة: العبارات 1، 7، 13 …
    expect(r?.cells[0].map((c) => c.questionNumber)).toEqual([1, 7, 13]);
    expect(r?.cells[2].map((c) => c.questionNumber)).toEqual([37, 43, 49]);
  });

  it("يرفض التصحيح إذا لم توجد قاعدة تحويل مطابقة", () => {
    const missing = RULES.filter((r) => !(r.dimensionId === "dim-A" && r.rawScore === 0));
    expect(() =>
      scoreAssessment({ ...base, rules: missing, answers: answersFor(() => 0) })
    ).toThrow(ScoringError);
  });

  it("يرفض أي طريقة حساب غير مدعومة", () => {
    expect(() =>
      scoreAssessment({ ...base, method: "MAGIC", answers: answersFor(() => 1) })
    ).toThrow(ScoringError);
  });

  it("يرفض صفّاً لا توجد له قواعد", () => {
    expect(() => gradeBandOf("9", ["10", "11", "12"])).toThrow(ScoringError);
    expect(gradeBandOf("12", ["10", "11", "12"])).toBe("12");
  });
});
