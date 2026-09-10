import { describe, expect, it } from "vitest";
import { buildNorms, percentileRank, MAX_RAW } from "@/features/assessment/norming";

/**
 * الرتبة المئينية تعريفها إحصائي: نسبة من هم دون الطالب في مجموعته
 * المرجعية، مضافاً إليها نصف من ساووه. هذه الاختبارات تثبّت الصيغة
 * وتمنع أي تقريب اجتهادي يتسلّل إليها.
 */
describe("حساب الرتبة المئينية", () => {
  it("يضع الدرجة الوسطى قرب المنتصف", () => {
    // عشرة طلاب موزّعون بالتساوي على درجتين: 0 و 9
    const counts = Array.from({ length: MAX_RAW + 1 }, () => 0);
    counts[0] = 5;
    counts[9] = 5;
    expect(percentileRank(counts, 0)).toBe(25);
    expect(percentileRank(counts, 9)).toBe(75);
  });

  it("يرفع الدرجة التي فوقها قليلون", () => {
    const counts = Array.from({ length: MAX_RAW + 1 }, () => 0);
    counts[3] = 90;
    counts[8] = 10;
    expect(percentileRank(counts, 8)).toBe(95);
  });

  it("لا يبلغ صفراً ولا مئة", () => {
    const counts = Array.from({ length: MAX_RAW + 1 }, () => 0);
    counts[0] = 1000;
    // من هم في القاع لا يقلّون عن 1، ومن هم في القمة لا يبلغون 100
    expect(percentileRank(counts, 0)).toBeGreaterThanOrEqual(1);
    counts[9] = 1;
    expect(percentileRank(counts, 9)).toBeLessThanOrEqual(99);
  });

  it("يرفض خلية بلا ملاحظات", () => {
    expect(() => percentileRank(Array.from({ length: MAX_RAW + 1 }, () => 0), 3)).toThrow();
  });
});

describe("بناء الجداول من نتائج الطلبة", () => {
  const observation = (gradeBand: string, gender: string, rawScore: number) => ({
    dimensionId: "dim-realistic",
    gradeBand,
    gender,
    rawScore,
  });

  it("يفصل المجموعات المرجعية بالصف والجنس معاً", () => {
    const rows = [
      ...Array.from({ length: 30 }, (_, i) => observation("10", "MALE", i % 10)),
      ...Array.from({ length: 30 }, (_, i) => observation("10", "FEMALE", i % 10)),
      ...Array.from({ length: 30 }, (_, i) => observation("11", "MALE", i % 10)),
    ];
    const groups = buildNorms(rows, 30);
    expect(groups).toHaveLength(3);
    expect(groups.every((g) => g.accepted)).toBe(true);
    expect(groups.every((g) => g.cells.length === MAX_RAW + 1)).toBe(true);
  });

  it("لا يعتمد خلية لم تبلغ عيّنتها الحدّ الأدنى", () => {
    const rows = Array.from({ length: 12 }, (_, i) => observation("9", "MALE", i % 10));
    const [group] = buildNorms(rows, 30);
    expect(group.sample).toBe(12);
    expect(group.accepted).toBe(false);
    expect(group.cells).toHaveLength(0);
  });

  it("يتجاهل الدرجات خارج المدى 0..9", () => {
    const rows = [
      ...Array.from({ length: 30 }, () => observation("12", "FEMALE", 5)),
      observation("12", "FEMALE", 11),
      observation("12", "FEMALE", -1),
    ];
    const [group] = buildNorms(rows, 30);
    expect(group.sample).toBe(30);
  });

  it("الرتب تتصاعد مع الدرجة الخام", () => {
    const rows = Array.from({ length: 60 }, (_, i) => observation("10", "MALE", i % 10));
    const [group] = buildNorms(rows, 30);
    const percentiles = group.cells.map((c) => c.percentile);
    for (let i = 1; i < percentiles.length; i++) {
      expect(percentiles[i]).toBeGreaterThanOrEqual(percentiles[i - 1]);
    }
  });
});
