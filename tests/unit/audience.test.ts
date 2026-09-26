import { describe, expect, it } from "vitest";
import {
  OPEN_TO_ALL,
  SUPPORT_CATEGORIES,
  offeredTo,
  programGender,
} from "@/features/programs/audience";

/**
 * تصفية «اعرف تخصصك» بالجنس وفئة الاستحقاق.
 * الأسماء والفئات في هذه الاختبارات منقولة من دليل الطالب كما ورد فيه،
 * فلو تغيّرت صياغته انكشف الخلل هنا لا في نتيجة طالب.
 */
describe("الجنس المقصور عليه البرنامج", () => {
  it("يقرأ «(للذكور فقط)»", () => {
    expect(programGender("الهندسة (للذكور فقط) — فرع مسقط")).toBe("MALE");
  });

  it("يقرأ «(للإناث فقط)»", () => {
    expect(programGender("تصميم الأزياء (للإناث فقط)")).toBe("FEMALE");
    expect(programGender("الفقه وأصوله (للإناث)")).toBe("FEMALE");
  });

  it("لا يقصر برنامجاً يذكر الجنسين", () => {
    expect(programGender("تقنيات الزراعة (ذكور/ إناث) الإنتاج النباتي")).toBeNull();
    expect(
      programGender("الهندسة (ذكور) كهربا صناعية (ذكور- إناث) - الرسم المعماري")
    ).toBeNull();
  });

  it("لا يقصر برنامجاً لم يُذكر فيه جنس", () => {
    expect(programGender("بكالوريوس الطب")).toBeNull();
  });
});

describe("عرض البرنامج على الطالب", () => {
  const all = { name: "بكالوريوس الطب", eligibility: OPEN_TO_ALL };

  it("يعرض المفتوح للجميع على الجنسين", () => {
    expect(offeredTo(all, { gender: "MALE" })).toBe(true);
    expect(offeredTo(all, { gender: "FEMALE" })).toBe(true);
  });

  it("يحجب المقصور على الجنس الآخر", () => {
    const male = { name: "الهندسة (للذكور فقط)", eligibility: OPEN_TO_ALL };
    expect(offeredTo(male, { gender: "MALE" })).toBe(true);
    expect(offeredTo(male, { gender: "FEMALE" })).toBe(false);
  });

  it("لا يحجب بالجنس إن لم يُختر جنس", () => {
    expect(offeredTo({ name: "تصميم الأزياء (للإناث فقط)", eligibility: "" }, {})).toBe(true);
  });

  it("يحجب برامج الفئات الخاصة عمّن ليس منها", () => {
    for (const c of SUPPORT_CATEGORIES) {
      const program = { name: "برنامج", eligibility: c.eligibility };
      expect(offeredTo(program, {})).toBe(false);
      expect(offeredTo(program, { support: { [c.key]: false } })).toBe(false);
      expect(offeredTo(program, { support: { [c.key]: true } })).toBe(true);
    }
  });

  it("لا تفتح فئةٌ مختارة برامج فئةٍ أخرى", () => {
    const socialSecurity = { name: "برنامج", eligibility: "ضمان اجتماعي" };
    expect(offeredTo(socialSecurity, { support: { limitedIncome: true } })).toBe(false);
  });

  it("يُبقي فئةً غير معروفة ظاهرة، فلا تُحجب فرصة بلا أساس", () => {
    expect(offeredTo({ name: "برنامج", eligibility: "فئة لم ترد في الدليل" }, {})).toBe(true);
  });

  it("يجمع الشرطين: الجنس والفئة", () => {
    const program = { name: "بكالوريوس التربية (للإناث فقط)", eligibility: "دخل محدود" };
    expect(offeredTo(program, { gender: "FEMALE", support: { limitedIncome: true } })).toBe(true);
    expect(offeredTo(program, { gender: "FEMALE" })).toBe(false);
    expect(offeredTo(program, { gender: "MALE", support: { limitedIncome: true } })).toBe(false);
  });
});
