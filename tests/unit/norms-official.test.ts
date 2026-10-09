import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * الجداول المعيارية الرسمية منقولة يدوياً عن ملحق (3) من دليل تطبيق المقياس.
 * النقل اليدوي يخطئ، والخطأ هنا يغيّر نتيجة طالب بلا أن يكسر شيئاً، فيُثبَّت
 * بالمثال المحلول في الدليل نفسه وبقواعد التغطية.
 */
const CSV = readFileSync(join(process.cwd(), "prisma", "seed-data", "norms.csv"), "utf8");

const GRADES = ["9", "10", "11", "12"];
const GENDERS = ["MALE", "FEMALE"];
const CODES = ["و", "س", "ف", "ا", "م", "ت"];

interface Row {
  grade: string;
  gender: string;
  code: string;
  percentiles: number[];
}

const rows: Row[] = CSV.split(/\r?\n/u)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#") && !l.startsWith("grade,"))
  .map((line) => {
    const [grade, gender, code, ...values] = line.split(",").map((p) => p.trim());
    return { grade, gender, code, percentiles: values.map(Number) };
  });

const at = (grade: string, gender: string, code: string, raw: number) =>
  rows.find((r) => r.grade === grade && r.gender === gender && r.code === code)?.percentiles[raw];

describe("الجداول المعيارية الرسمية", () => {
  it("تغطّي كل توليفة صف ونوع وبيئة", () => {
    expect(rows).toHaveLength(GRADES.length * GENDERS.length * CODES.length);
    for (const grade of GRADES) {
      for (const gender of GENDERS) {
        for (const code of CODES) {
          const row = rows.find((r) => r.grade === grade && r.gender === gender && r.code === code);
          expect(row, `${grade} ${gender} ${code}`).toBeDefined();
          expect(row!.percentiles).toHaveLength(10);
        }
      }
    }
  });

  it("كل رتبة بين 1 و99 ولا تنقص كلما زادت الدرجة الخام", () => {
    for (const row of rows) {
      const where = `${row.grade} ${row.gender} ${row.code}`;
      for (const p of row.percentiles) {
        expect(p, where).toBeGreaterThanOrEqual(1);
        expect(p, where).toBeLessThanOrEqual(99);
      }
      for (let raw = 1; raw < 10; raw++) {
        expect(row.percentiles[raw], `${where} عند ${raw}`).toBeGreaterThanOrEqual(
          row.percentiles[raw - 1]
        );
      }
      // الدرجة التامة أعلى الرتب في كل جداول الدليل
      expect(row.percentiles[9], where).toBe(99);
    }
  });

  it("تطابق المثال المحلول في الدليل — عاشر ذكر (ص27-28)", () => {
    expect(at("10", "MALE", "و", 7)).toBe(94);
    expect(at("10", "MALE", "س", 4)).toBe(38);
    expect(at("10", "MALE", "ف", 3)).toBe(37);
    expect(at("10", "MALE", "ا", 8)).toBe(88);
    expect(at("10", "MALE", "م", 3)).toBe(17);
    expect(at("10", "MALE", "ت", 6)).toBe(54);
  });

  it("تنقل صفّ الدرجة صفر كما في الدليل", () => {
    // أوّل صفٍّ في جدول التاسع ذكور: 2 و1 و1 و1 و1 و1
    expect(at("9", "MALE", "و", 0)).toBe(2);
    expect(at("9", "MALE", "س", 0)).toBe(1);
    expect(at("9", "MALE", "ت", 0)).toBe(1);
    // وفي جداول الإناث تبدأ الواقعية من 3
    expect(at("9", "FEMALE", "و", 0)).toBe(3);
    expect(at("12", "FEMALE", "و", 0)).toBe(3);
  });
});
