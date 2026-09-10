import { describe, expect, it } from "vitest";
import {
  scoreAssessment,
  gradeBandOf,
  ScoringError,
  type ScoringDimension,
  type ScoringQuestion,
  type ScoringRuleRow,
} from "@/features/assessment/scoring";

/**
 * البنية كما ينصّ عليها الدليل: ست بيئات، لكل بيئة 9 عبارات،
 * والعبارات موزّعة في ثلاث دفعات كل واحدة 18 عبارة،
 * وكل بيئة تأخذ ثلاث عبارات متتالية من كل دفعة.
 */
const CODES = ["و", "س", "ف", "ا", "م", "ت"];

const DIMENSIONS: ScoringDimension[] = CODES.map((code, i) => ({
  id: `dim-${i}`,
  code,
  label: `بيئة ${code}`,
  description: `وصف ${code}`,
  color: "#000000",
  fields: [`مجال ${code}`, "مجال مشترك"],
  displayOrder: i + 1,
}));

/** رقم العبارة ← البيئة، حسب توزيع الدليل. */
function dimensionIndexFor(number: number): number {
  const withinBlock = (number - 1) % 18; // 0..17
  return Math.floor(withinBlock / 3); // كل ثلاث عبارات لبيئة
}

const QUESTIONS: ScoringQuestion[] = Array.from({ length: 54 }, (_, i) => {
  const number = i + 1;
  return {
    id: `q-${number}`,
    number,
    text: `عبارة ${number}`,
    dimensionId: `dim-${dimensionIndexFor(number)}`,
  };
});

/** جدول معياري صناعي للاختبار: الذكور = الدرجة × 11، الإناث = الدرجة × 9. */
const RULES: ScoringRuleRow[] = DIMENSIONS.flatMap((dim) =>
  ["MALE", "FEMALE"].flatMap((gender) =>
    Array.from({ length: 10 }, (_, raw) => ({
      dimensionId: dim.id,
      gradeBand: "10",
      gender,
      rawScore: raw,
      percentile: raw * (gender === "MALE" ? 11 : 9),
    }))
  )
);

const base = {
  dimensions: DIMENSIONS,
  questions: QUESTIONS,
  rules: RULES,
  method: "COUNT_PREFERRED_THEN_PERCENTILE",
  gradeBand: "10",
  gender: "MALE",
};

function answersFor(pattern: (q: ScoringQuestion) => number): Map<string, number> {
  return new Map(QUESTIONS.map((q) => [q.id, pattern(q)]));
}

describe("توزيع العبارات على البيئات", () => {
  it("يوزّع 54 عبارة على ست بيئات بتسع عبارات لكل بيئة", () => {
    expect(QUESTIONS).toHaveLength(54);
    for (const dim of DIMENSIONS) {
      expect(QUESTIONS.filter((q) => q.dimensionId === dim.id)).toHaveLength(9);
    }
  });

  it("يطابق أرقام العبارات الواردة في الدليل لكل بيئة", () => {
    const expected: Record<string, number[]> = {
      "dim-0": [1, 2, 3, 19, 20, 21, 37, 38, 39],
      "dim-1": [4, 5, 6, 22, 23, 24, 40, 41, 42],
      "dim-2": [7, 8, 9, 25, 26, 27, 43, 44, 45],
      "dim-3": [10, 11, 12, 28, 29, 30, 46, 47, 48],
      "dim-4": [13, 14, 15, 31, 32, 33, 49, 50, 51],
      "dim-5": [16, 17, 18, 34, 35, 36, 52, 53, 54],
    };
    for (const [dimensionId, numbers] of Object.entries(expected)) {
      const actual = QUESTIONS.filter((q) => q.dimensionId === dimensionId)
        .map((q) => q.number)
        .sort((a, b) => a - b);
      expect(actual).toEqual(numbers);
    }
  });
});

describe("محرّك التصحيح", () => {
  it("يبني ستة جداول نتيجة، كل جدول 3 صفوف × 3 أعمدة", () => {
    const result = scoreAssessment({ ...base, answers: answersFor(() => 1) });
    expect(result.sections).toHaveLength(6);
    for (const section of result.sections) {
      expect(section.cells).toHaveLength(3);
      for (const row of section.cells) expect(row).toHaveLength(3);
    }
  });

  it("يضع العبارات في الشبكة بترتيب أرقامها", () => {
    const result = scoreAssessment({ ...base, answers: answersFor(() => 0) });
    const first = result.sections[0];
    expect(first.cells[0].map((c) => c.questionNumber)).toEqual([1, 2, 3]);
    expect(first.cells[1].map((c) => c.questionNumber)).toEqual([19, 20, 21]);
    expect(first.cells[2].map((c) => c.questionNumber)).toEqual([37, 38, 39]);
  });

  it("يحسب الدرجة الخام كعدد العبارات المفضّلة لا كمجموع قيم", () => {
    const result = scoreAssessment({
      ...base,
      answers: answersFor((q) => (q.dimensionId === "dim-0" ? 1 : 0)),
    });
    expect(result.sections[0].rawScore).toBe(9);
    expect(result.sections[1].rawScore).toBe(0);
  });

  it("يقرأ الرتبة المئينية من جدول صفّ الطالب ونوعه", () => {
    const answers = answersFor((q) => (q.dimensionId === "dim-0" && q.number < 25 ? 1 : 0));
    const male = scoreAssessment({ ...base, answers });
    const female = scoreAssessment({ ...base, gender: "FEMALE", answers });

    expect(male.sections[0].rawScore).toBe(6);
    expect(male.sections[0].percentile).toBe(66); // 6 × 11
    expect(female.sections[0].percentile).toBe(54); // 6 × 9
  });

  it("يرتّب البيئات ويولّد رمز الميول من الثلاث الأعلى", () => {
    const strong = new Set(["dim-3", "dim-0"]);
    const result = scoreAssessment({
      ...base,
      answers: answersFor((q) =>
        strong.has(q.dimensionId) ? 1 : q.dimensionId === "dim-5" && q.number < 40 ? 1 : 0
      ),
    });

    expect(result.topDimensions).toHaveLength(3);
    expect(result.topDimensions[2]).toBe("ت");
    expect(result.interestCode.split(" - ")).toEqual(result.topDimensions);
    expect(result.analysis.map((a) => a.rank).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("يجمع المجالات المقترحة بلا تكرار", () => {
    const result = scoreAssessment({
      ...base,
      answers: answersFor((q) => (q.dimensionId === "dim-0" ? 1 : 0)),
    });
    expect(new Set(result.recommendedFields).size).toBe(result.recommendedFields.length);
  });

  it("يرفض التصحيح إذا نقصت خلية من الجدول المعياري", () => {
    const missing = RULES.filter(
      (r) => !(r.dimensionId === "dim-2" && r.rawScore === 0 && r.gender === "MALE")
    );
    expect(() =>
      scoreAssessment({ ...base, rules: missing, answers: answersFor(() => 0) })
    ).toThrow(ScoringError);
  });

  it("يرفض احتساب نتيجة بجدول نوع آخر", () => {
    const maleOnly = RULES.filter((r) => r.gender === "MALE");
    expect(() =>
      scoreAssessment({
        ...base,
        gender: "FEMALE",
        rules: maleOnly,
        answers: answersFor(() => 1),
      })
    ).toThrow(ScoringError);
  });

  it("يرفض أي طريقة حساب غير مدعومة", () => {
    expect(() =>
      scoreAssessment({ ...base, method: "MAGIC", answers: answersFor(() => 1) })
    ).toThrow(ScoringError);
  });

  it("يرفض صفّاً لا يوجد له جدول", () => {
    expect(() => gradeBandOf("8", ["9", "10", "11", "12"])).toThrow(ScoringError);
    expect(gradeBandOf("9", ["9", "10", "11", "12"])).toBe("9");
  });
});
