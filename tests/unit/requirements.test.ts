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

/**
 * صيغ الدليل التي كانت تفلت من القراءة فيظهر البرنامج لمن لا يستحقّه.
 * النصوص هنا منقولة عن برامج بعينها في الدليل، ورمز البرنامج في اسم الاختبار
 * ليُراجَع عند أي تغيير.
 */
describe("صيغ الشروط في الدليل", () => {
  it("«كل منها» تجعل كل مادة شرطاً مستقلاً — SQ650 التربية الفنية", () => {
    const parsed = parseRequirements(
      [
        "• النجاح في دبلوم التعليم العام بتقدير (75%).",
        "• دراسة المواد الآتية:-",
        "- اللغة العربية، اللغة الإنجليزية",
        "الفنون التشكيلية والحصول على (65%) كحد",
        "أدنى في كل منها.",
      ].join("\n")
    );
    expect(parsed.minOverall).toBe(75);
    expect(parsed.rules).toEqual([
      { min: 65, anyOf: ["اللغة العربية"], count: 1 },
      { min: 65, anyOf: ["اللغة الإنجليزية"], count: 1 },
      { min: 65, anyOf: ["الفنون التشكيلية"], count: 1 },
    ]);
  });

  it("يصل اسم المادة المقطوع بين بنود القائمة — SQ600 التربية البدنية", () => {
    const parsed = parseRequirements(
      [
        "• دراسة المواد الآتية:-",
        "- اللغة العربية، اللغة الإنجليزية، الرياضة",
        "المدرسية والحصول على (65%) كحد أدنى في",
        "كل منها.",
      ].join("\n")
    );
    expect(parsed.rules.map((r) => r.anyOf[0])).toEqual([
      "اللغة العربية",
      "اللغة الإنجليزية",
      "الرياضة المدرسية",
    ]);
  });

  it("«ثلاث منها» شرطٌ واحد من مجموع المواد — SQ410", () => {
    const parsed = parseRequirements(
      [
        "• دراسة المواد الأربعة الآتية:-",
        "- الرياضيات المتقدمة، الكيمياء، الفيزياء",
        "الأحياء والحصول على (65%) كحد أدنى في",
        "ثلاث منها.",
      ].join("\n")
    );
    expect(parsed.rules).toHaveLength(1);
    expect(parsed.rules[0].count).toBe(3);
    expect(parsed.rules[0].min).toBe(65);
    expect(parsed.rules[0].anyOf).toHaveLength(4);
  });

  it("«ثلاث مواد من» تكمل جملة النسبة ولا تُحسب معدلاً عاماً — SE416", () => {
    const parsed = parseRequirements(
      [
        "• الحصول على معدل عام لا يقل عن (85%).",
        "• الحصول على معدل عام لا يقل عن (85%)",
        "في ثلاث مواد من:",
        "الرياضيات المتقدمة أو الأحياء أو الكيمياء",
        "أو الفيزياء.",
        "• الحصول على (85%) في اللغة الإنجليزية.",
      ].join("\n")
    );
    expect(parsed.minOverall).toBe(85);
    expect(parsed.rules[0]).toEqual({
      min: 85,
      anyOf: ["الرياضيات المتقدمة", "الأحياء", "الكيمياء", "الفيزياء"],
      count: 3,
    });
    expect(parsed.rules[1]).toEqual({ min: 85, anyOf: ["اللغة الإنجليزية"], count: 1 });
  });

  it("«النجاح في المواد الآتية» شرط دراسةٍ بلا نسبة مخترعة — MT1001", () => {
    const parsed = parseRequirements(
      [
        "• النجاح في دبلوم التعليم العام بتقدير (55%).",
        "• النجاح في المواد التالية:-",
        "- الرياضيات المتقدمة أو الأساسية.",
        "- الفيزياء.",
      ].join("\n")
    );
    expect(parsed.minOverall).toBe(55);
    expect(parsed.rules).toEqual([
      { min: 0, anyOf: ["الرياضيات المتقدمة", "الرياضيات الأساسية"], count: 1 },
      { min: 0, anyOf: ["الفيزياء"], count: 1 },
    ]);
  });

  it("يقرأ النسبة حين تنقطع عن جملتها — BS081", () => {
    const parsed = parseRequirements(
      [
        "• النجاح في دبلوم التعليم العام بتقدير",
        "(65%).",
        "• الحصول على (60%) في:-",
        "- الرياضيات المتقدمة أو تقنية",
        "المعلومات.",
        "- اللغة الإنجليزية",
      ].join("\n")
    );
    expect(parsed.minOverall).toBe(65);
    expect(parsed.rules).toEqual([
      { min: 60, anyOf: ["الرياضيات المتقدمة", "تقنية المعلومات"], count: 1 },
      { min: 60, anyOf: ["اللغة الإنجليزية"], count: 1 },
    ]);
  });

  it("بنودٌ ضاعت ترويستها تبقى شرط دراسة لا شرطاً مُهمَلاً — BS230", () => {
    const parsed = parseRequirements(
      [
        "- الأحياء",
        "- الكيمياء",
        "- الفيزياء",
        "• الحصول على (55%) في اللغة الإنجليزية.",
      ].join("\n")
    );
    expect(parsed.rules).toEqual([
      { min: 0, anyOf: ["الأحياء"], count: 1 },
      { min: 0, anyOf: ["الكيمياء"], count: 1 },
      { min: 0, anyOf: ["الفيزياء"], count: 1 },
      { min: 55, anyOf: ["اللغة الإنجليزية"], count: 1 },
    ]);
  });

  it("واو العطف بين مادتين مطلوبتين معاً لا تجعلهما بديلتين — BS053", () => {
    const parsed = parseRequirements(
      [
        "• الحصول على (65%) في المواد الآتية:-",
        "- الرياضيات المتقدمة أو الأساسية والفيزياء",
        "أو الكيمياء.",
      ].join("\n")
    );
    expect(parsed.rules).toEqual([
      { min: 65, anyOf: ["الرياضيات المتقدمة", "الرياضيات الأساسية"], count: 1 },
      { min: 65, anyOf: ["الفيزياء", "الكيمياء"], count: 1 },
    ]);
  });

  it("شرط الآيلتس يبقى نصّاً ولا يصير شرط مادة — IG991", () => {
    const parsed = parseRequirements(
      [
        "• الحصول على (55%) في:-",
        "- اللغة الإنجليزية",
        "- الحصول على معدل لا يقل عن (5.5) في",
        "امتحان اللغة الإنجليزية IELTS وأن لا تقل",
      ].join("\n")
    );
    expect(parsed.rules).toEqual([{ min: 55, anyOf: ["اللغة الإنجليزية"], count: 1 }]);
    expect(parsed.unparsed.join(" ")).toContain("IELTS");
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

// ═══════════════════════════════════════════════════════════════
// شرطٌ يلي شرطاً: متى يكون بديلاً عنه ومتى يكون شرطاً ثانياً.
// كل نصٍّ هنا منقول حرفياً من دليل الطالب، ورمزُ برنامجه معه.
// خلطُ الاثنين كان يُظهر برامج الرياضيات المتقدمة لطالب الأساسية.
// ═══════════════════════════════════════════════════════════════
describe("البديل والشرط الثاني لا يختلطان", () => {
  it("«النجاح في اللغة الإنجليزية» شرطٌ ثانٍ لا بديلٌ عن الرياضيات — U1012", () => {
    const parsed = parseRequirements(
      [
        "• النجاح في دبلوم التعليم العام بتقدير (80%).",
        "• الحصول على (70%) في الرياضيات المتقدمة.",
        "• النجاح في اللغة الإنجليزية.",
      ].join("\n")
    );
    expect(parsed.rules).toEqual([
      { min: 70, anyOf: ["الرياضيات المتقدمة"], count: 1 },
      { min: 0, anyOf: ["اللغة الإنجليزية"], count: 1 },
    ]);
    // طالب الرياضيات الأساسية لا يستوفيه مهما بلغت لغته
    expect(canStudyWith(parsed, ["الرياضيات الأساسية", "اللغة الإنجليزية"])).toBe(false);
    expect(canStudyWith(parsed, ["الرياضيات المتقدمة", "اللغة الإنجليزية"])).toBe(true);
  });

  it("شرط الآيلتس لا يصير بديلاً عن الرياضيات المتقدمة — EG008", () => {
    const parsed = parseRequirements(
      [
        "• النجاح في دبلوم التعليم العام بمعدل لا يقل عن (90%).",
        "• الحصول على (90%) في الرياضيات المتقدمة.",
        "• الحصول على معدل لا يقل عن (5.5) في امتحان اللغة الإنجليزية Academic UKVI IELTS.",
      ].join("\n")
    );
    expect(parsed.rules).toEqual([{ min: 90, anyOf: ["الرياضيات المتقدمة"], count: 1 }]);
    expect(canStudyWith(parsed, ["الرياضيات الأساسية", "اللغة الإنجليزية"])).toBe(false);
  });

  it("واوُ العطف على رأس السطر عطفُ وجوبٍ لا بدلٍ — BS112", () => {
    const parsed = parseRequirements(
      [
        "• الحصول على (60%) في اللغة الإنجليزية",
        "والرياضيات المتقدمة أو الأساسية.",
        "• الحصول على (55%) في اللغة العربية.",
      ].join("\n")
    );
    expect(parsed.rules).toEqual([
      { min: 60, anyOf: ["اللغة الإنجليزية"], count: 1 },
      { min: 60, anyOf: ["الرياضيات المتقدمة", "الرياضيات الأساسية"], count: 1 },
      { min: 55, anyOf: ["اللغة العربية"], count: 1 },
    ]);
  });

  it("بندٌ تحت النسبة نفسها شرطٌ ثانٍ بها — U0084", () => {
    const parsed = parseRequirements(
      [
        "• الحصول على (65%) في الرياضيات المتقدمة",
        "أو الأساسية.",
        "- اللغة الإنجليزية.",
      ].join("\n")
    );
    expect(parsed.rules).toEqual([
      { min: 65, anyOf: ["الرياضيات المتقدمة", "الرياضيات الأساسية"], count: 1 },
      { min: 65, anyOf: ["اللغة الإنجليزية"], count: 1 },
    ]);
  });

  it("اسمُ مادةٍ انقطع آخر السطر يُضيَّق لا يُوسَّع — U1016", () => {
    const parsed = parseRequirements(
      ["• الحصول على (60%) كحد أدنى في الرياضيات", "المتقدمة."].join("\n")
    );
    expect(parsed.rules).toEqual([{ min: 60, anyOf: ["الرياضيات المتقدمة"], count: 1 }]);
  });

  it("«الرياضيات» مجرّدةً تقبل الصيغتين، فالدليل لم يحدّد — U1220", () => {
    const parsed = parseRequirements(["• الحصول على (65%) في:-", "- الرياضيات والفيزياء."].join("\n"));
    expect(parsed.rules).toEqual([
      { min: 65, anyOf: ["الرياضيات المتقدمة", "الرياضيات الأساسية"], count: 1 },
      { min: 65, anyOf: ["الفيزياء"], count: 1 },
    ]);
  });

  it("لكل بديلٍ نسبته حين يفرّق الدليل — BS207", () => {
    const parsed = parseRequirements(
      "• الحصول على (65%) في الرياضيات المتقدمة أو (80%) في الرياضيات الأساسية."
    );
    expect(parsed.rules).toHaveLength(1);
    expect(parsed.rules[0].mins).toEqual({
      "الرياضيات المتقدمة": 65,
      "الرياضيات الأساسية": 80,
    });
    const basic = (m: number) =>
      checkEligibility(parsed, { "الرياضيات الأساسية": m }, 90).eligible;
    expect(basic(70)).toBe(false); // دون الثمانين المشترطة للأساسية
    expect(basic(85)).toBe(true);
    expect(checkEligibility(parsed, { "الرياضيات المتقدمة": 70 }, 90).eligible).toBe(true);
  });
});

describe("الواو في سطر التكملة تفصل شرطاً عن شرط", () => {
  it("«أو الأساسية والأحياء» بديلُ رياضياتٍ ثم مادةٌ مطلوبةٌ معها — VC005", () => {
    const parsed = parseRequirements(
      [
        "• النجاح في دبلوم التعليم العام بتقدير (60%).",
        "• الحصول على (55%) في الرياضيات المتقدمة",
        "أو الأساسية والأحياء.",
        "• الحصول على (50%) في اللغة الإنجليزية.",
      ].join("\n")
    );
    expect(parsed.rules).toEqual([
      { min: 55, anyOf: ["الرياضيات المتقدمة", "الرياضيات الأساسية"], count: 1 },
      { min: 55, anyOf: ["الأحياء"], count: 1 },
      { min: 50, anyOf: ["اللغة الإنجليزية"], count: 1 },
    ]);
    // طالبٌ بالأساسية بلا أحياء لا يستوفيه
    expect(canStudyWith(parsed, ["الرياضيات الأساسية", "الكيمياء", "اللغة الإنجليزية"])).toBe(false);
    expect(canStudyWith(parsed, ["الرياضيات الأساسية", "الأحياء", "اللغة الإنجليزية"])).toBe(true);
  });
});
