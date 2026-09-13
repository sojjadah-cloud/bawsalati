import { describe, expect, it } from "vitest";
import {
  parseRequirements,
  readSubjects,
  checkEligibility,
  canStudyWith,
  competitiveAverage,
  type Marks,
} from "@/features/programs/requirements";
import { GUIDE_FIELDS, SUBJECT_GROUPS, SUBJECT_PLAN } from "@/lib/constants";

/**
 * شروط القبول في الدليل نثر، والقبول لا يُبنى على تخمين.
 * هذه الاختبارات تثبّت ما يُقرأ وما يُترك، وتثبّت صيغة المعدل التنافسي
 * كما وردت في صفحة 11 من الدليل.
 */
describe("قراءة المواد", () => {
  it("يقرأ المادة الواحدة", () => {
    expect(readSubjects("الكيمياء")).toEqual(["الكيمياء"]);
  });

  it("يفصل البدائل بـ«أو»", () => {
    expect(readSubjects("الفيزياء أو الرياضيات المتقدمة")).toEqual([
      "الفيزياء",
      "الرياضيات المتقدمة",
    ]);
  });

  it("يكمل الاسم المختصر من سياقه", () => {
    expect(readSubjects("الرياضيات المتقدمة أو الأساسية")).toEqual([
      "الرياضيات المتقدمة",
      "الرياضيات الأساسية",
    ]);
  });

  it("يتجاهل ما ليس مادة", () => {
    expect(readSubjects("اجتياز المقابلة الشخصية")).toEqual([]);
  });
});

describe("قراءة الشروط", () => {
  it("يقرأ المعدل العام وشروط المواد", () => {
    const parsed = parseRequirements(
      [
        "• النجاح في دبلوم التعليم العام.",
        "• الحصول على معدل عام لا يقل عن (95%).",
        "• الحصول على:-",
        "- (95%) في الكيمياء.",
        "- (90%) في الأحياء أو الفيزياء.",
      ].join("\n")
    );

    expect(parsed.minOverall).toBe(95);
    expect(parsed.rules).toHaveLength(2);
    expect(parsed.rules[0]).toEqual({ min: 95, anyOf: ["الكيمياء"], count: 1 });
    expect(parsed.rules[1].anyOf).toEqual(["الأحياء", "الفيزياء"]);
    expect(parsed.unparsed).toHaveLength(0);
  });

  it("يقرأ التقدير بصيغة دبلوم التعليم العام", () => {
    const parsed = parseRequirements("• النجاح في دبلوم التعليم العام بتقدير (65%).");
    expect(parsed.minOverall).toBe(65);
  });

  it("ينسب النسبة المعلنة إلى المواد التي تليها", () => {
    const parsed = parseRequirements(
      ["• الحصول على (60%) في المواد الآتية:-", "- الرياضيات المتقدمة.", "- الفيزياء."].join("\n")
    );
    expect(parsed.rules).toEqual([
      { min: 60, anyOf: ["الرياضيات المتقدمة"], count: 1 },
      { min: 60, anyOf: ["الفيزياء"], count: 1 },
    ]);
  });

  it("يصل السطر المقطوع بسابقه", () => {
    const parsed = parseRequirements(
      ["• الحصول على (60%) في الرياضيات", "المتقدمة أو الأساسية أو إدارة الأعمال."].join("\n")
    );
    expect(parsed.rules).toHaveLength(1);
    expect(parsed.rules[0].anyOf).toContain("الرياضيات الأساسية");
    expect(parsed.rules[0].anyOf).toContain("إدارة الأعمال");
  });

  it("لا يخترع شرطاً من كلام إجرائي", () => {
    const parsed = parseRequirements("• اجتياز المقابلة الشخصية والفحص الطبي.");
    expect(parsed.rules).toHaveLength(0);
    expect(parsed.minOverall).toBeNull();
  });
});

describe("مطابقة الطالب", () => {
  const parsed = parseRequirements(
    [
      "• الحصول على معدل عام لا يقل عن (80%).",
      "- (90%) في الكيمياء.",
      "- (85%) في الفيزياء أو الرياضيات المتقدمة.",
    ].join("\n")
  );

  it("يقبل من استوفى كل شرط", () => {
    const marks: Marks = { "الكيمياء": 92, "الفيزياء": 70, "الرياضيات المتقدمة": 88 };
    const result = checkEligibility(parsed, marks, 85);
    expect(result.eligible).toBe(true);
  });

  it("يرفض من قصّر في مادة", () => {
    const marks: Marks = { "الكيمياء": 88, "الفيزياء": 90 };
    const result = checkEligibility(parsed, marks, 90);
    expect(result.eligible).toBe(false);
    expect(result.checks[0].met).toBe(false);
  });

  it("يرفض من قصّر معدّله العام وحده", () => {
    const marks: Marks = { "الكيمياء": 95, "الفيزياء": 95 };
    const result = checkEligibility(parsed, marks, 70);
    expect(result.eligible).toBe(false);
    expect(result.overallMet).toBe(false);
  });

  it("يرصد المواد التي لم يدرسها الطالب", () => {
    const result = checkEligibility(parsed, { "الكيمياء": 95 }, 90);
    expect(result.missingSubjects).toContain("الفيزياء");
  });

  it("طالب بلا درجات: تكفيه مواده", () => {
    expect(canStudyWith(parsed, ["الكيمياء", "الفيزياء"])).toBe(true);
    expect(canStudyWith(parsed, ["الكيمياء"])).toBe(false);
  });
});

describe("المعدل التنافسي", () => {
  /**
   * الدليل صفحة 11:
   *   النتيجة 1 = معدل جميع المواد × 0.4
   *   النتيجة 2 = معدل مواد البرنامج × 0.6
   *   المعدل التنافسي = النتيجة 1 + النتيجة 2
   */
  it("يطابق صيغة الدليل حسابياً", () => {
    const parsed = parseRequirements("- (90%) في الكيمياء.\n- (90%) في الفيزياء.");
    const marks: Marks = { "الكيمياء": 100, "الفيزياء": 100, "اللغة العربية": 50 };
    // معدل الكل = 83.333…، ومعدل مواد البرنامج = 100
    const expected = Math.round(((250 / 3) * 0.4 + 100 * 0.6) * 100) / 100;
    expect(competitiveAverage(parsed, marks)).toBe(expected);
  });

  it("يرجّح مواد البرنامج على بقيّة المواد", () => {
    const parsed = parseRequirements("- (60%) في الكيمياء.");
    const strongInProgram = competitiveAverage(parsed, { "الكيمياء": 100, "اللغة العربية": 60 });
    const weakInProgram = competitiveAverage(parsed, { "الكيمياء": 60, "اللغة العربية": 100 });
    expect(strongInProgram).toBeGreaterThan(weakInProgram!);
  });

  it("لا يحتسب معدّلاً بلا مواد برنامج معروفة", () => {
    const parsed = parseRequirements("• اجتياز المقابلة الشخصية.");
    expect(competitiveAverage(parsed, { "الكيمياء": 90 })).toBeNull();
  });
});

describe("خطة الصف الحادي عشر", () => {
  it("تجمع المواد في مجموعاتها كما في الخطة الرسمية", () => {
    expect(SUBJECT_GROUPS.core).toHaveLength(4);
    expect(SUBJECT_GROUPS.math).toEqual(["الرياضيات المتقدمة", "الرياضيات الأساسية"]);
    expect(SUBJECT_GROUPS.science).toContain("العلوم البيئية");
    expect(SUBJECT_PLAN).toEqual({ electiveCount: 3, minScience: 1, mathCount: 1 });
  });

  it("لا تتكرّر مادة بين المجموعات", () => {
    const all = [
      ...SUBJECT_GROUPS.core,
      ...SUBJECT_GROUPS.math,
      ...SUBJECT_GROUPS.science,
      ...SUBJECT_GROUPS.elective,
      ...SUBJECT_GROUPS.other,
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it("تقرأ المواد الجديدة في شروط الدليل", () => {
    expect(readSubjects("العلوم البيئية")).toEqual(["العلوم البيئية"]);
    expect(readSubjects("الجغرافيا الاقتصادية")).toEqual(["الجغرافيا الاقتصادية"]);
    expect(readSubjects("التاريخ")).toEqual(["التاريخ (الحضارة الإسلامية)"]);
  });

  it("مسار علمي يفتح ما لا يفتحه المسار الأدبي", () => {
    const medicine = parseRequirements(
      ["• الحصول على (90%) في الكيمياء.", "• الحصول على (90%) في الأحياء."].join("\n")
    );
    const science = ["الكيمياء", "الأحياء", "الفيزياء"] as const;
    const literary = ["الجغرافيا الاقتصادية", "التاريخ (الحضارة الإسلامية)"] as const;
    expect(canStudyWith(medicine, [...science])).toBe(true);
    expect(canStudyWith(medicine, [...literary])).toBe(false);
  });
});

describe("مجالات الدليل", () => {
  it("ثلاثة عشر مجالاً بنطاقات صفحات متتابعة بلا تداخل ولا فجوة", () => {
    expect(GUIDE_FIELDS).toHaveLength(13);
    expect(GUIDE_FIELDS[0].from).toBe(74);
    expect(GUIDE_FIELDS[GUIDE_FIELDS.length - 1].to).toBe(242);
    for (let i = 1; i < GUIDE_FIELDS.length; i++) {
      expect(GUIDE_FIELDS[i].from).toBe(GUIDE_FIELDS[i - 1].to + 1);
    }
  });

  it("كل نطاق يبدأ قبل نهايته", () => {
    for (const f of GUIDE_FIELDS) expect(f.to).toBeGreaterThan(f.from);
  });
});
