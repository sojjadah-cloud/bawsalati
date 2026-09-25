// نصوص وثوابت الواجهة العربية.

export const BRAND = {
  name: "بوصلتي",
  tagline: "منصة التوجيه المهني",
  description:
    "منصة التوجيه المهني: اختبار ميول، مكتبة رقمية، دليل الطالب، وموعد مع أخصائي.",
  email: "bawsalati@soharboys.edu.om",
  phone: "+968 92549426",
  location: "سلطنة عُمان — صحار",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  SPECIALIST: "أخصائي التوجيه المهني",
};

export const GRADES = [
  { value: "9", label: "الصف التاسع" },
  { value: "10", label: "الصف العاشر" },
  { value: "11", label: "الصف الحادي عشر" },
  { value: "12", label: "الصف الثاني عشر" },
] as const;

/**
 * صفوف قسم «اعرف تخصصك». الصف التاسع خارجه: الخطة الدراسية تبدأ من العاشر،
 * فلا مواد ولا درجات تُطابَق بها شروط البرامج.
 */
export const ELIGIBILITY_GRADES = GRADES.filter((g) => g.value !== "9");

/** الجنس مطلوب لأن الجداول المعيارية تختلف بين الذكور والإناث. */
export const GENDERS = [
  { value: "MALE", label: "ذكر" },
  { value: "FEMALE", label: "أنثى" },
] as const;

export const GENDER_LABELS: Record<string, string> = Object.fromEntries(
  GENDERS.map((g) => [g.value, g.label])
);

export const GRADE_LABELS: Record<string, string> = Object.fromEntries(
  GRADES.map((g) => [g.value, g.label])
);

/**
 * خطة الصف الحادي عشر الرسمية:
 * أربع مواد إلزامية، ومادة رياضيات واحدة، وثلاث مواد اختيارية
 * على أن تكون واحدة منها على الأقل مادة علمية.
 */
export const SUBJECT_GROUPS = {
  /** تُدرَس للجميع ولا تُختار */
  core: ["التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", "الدراسات الاجتماعية"],
  /** يختار الطالب واحدة منهما */
  math: ["الرياضيات المتقدمة", "الرياضيات الأساسية"],
  /** مواد علمية — واحدة منها على الأقل ضمن الاختيارية الثلاث */
  science: ["الفيزياء", "الكيمياء", "الأحياء", "العلوم البيئية"],
  /** بقيّة المواد الاختيارية */
  elective: [
    "تقنية المعلومات",
    "الجغرافيا الاقتصادية",
    "التاريخ (الحضارة الإسلامية)",
    "مهارات اللغة الإنجليزية",
    "اللغة الألمانية",
    "اللغة الفرنسية",
    "اللغة الصينية",
    "الرياضة المدرسية",
    "الفنون التشكيلية",
    "المهارات الموسيقية",
  ],
  /**
   * مواد ترد في شروط برامج الدليل ولا تُختار في خطة الحادي عشر
   * (مسارات أخرى). تبقى معروفةً كي تُقرأ الشروط التي تذكرها.
   */
  other: ["الجيولوجيا", "إدارة الأعمال", "الهندسة"],
} as const;

/** قواعد الخطة: كم مادة اختيارية، وكم مادة علمية على الأقل. */
export const SUBJECT_PLAN = { electiveCount: 3, minScience: 1, mathCount: 1 } as const;

/** كل المواد المعروفة للنظام: خطة الحادي عشر وما يرد في شروط الدليل. */
export const SUBJECTS = [
  ...SUBJECT_GROUPS.core,
  ...SUBJECT_GROUPS.math,
  ...SUBJECT_GROUPS.science,
  ...SUBJECT_GROUPS.elective,
  ...SUBJECT_GROUPS.other,
] as const;

/**
 * المجالات الأكاديمية بترتيب الدليل ونطاق صفحات كل مجال فيه.
 * تُعرض للطالب ليعرف أين يقرأ، ويُتحقّق بها من تصنيف كل برنامج.
 */
export const GUIDE_FIELDS = [
  { field: "الصحة", from: 74, to: 93 },
  { field: "برامج دراسية متعددة التخصصات", from: 94, to: 108 },
  { field: "العلوم الطبيعية والفيزيائية", from: 109, to: 116 },
  { field: "الزراعة والبيئة والعلوم المرتبطة بها", from: 117, to: 121 },
  { field: "الهندسة والتقنيات ذات الصلة", from: 122, to: 145 },
  { field: "العمارة والإنشاء", from: 146, to: 152 },
  { field: "تكنولوجيا المعلومات", from: 153, to: 169 },
  { field: "التربية", from: 170, to: 187 },
  { field: "الإدارة والمعاملات التجارية", from: 188, to: 206 },
  { field: "المجتمع والثقافة", from: 207, to: 217 },
  { field: "الفنون الإبداعية", from: 218, to: 225 },
  { field: "الدين والفلسفة", from: 226, to: 228 },
  { field: "البرامج المخصصة للطلبة ذوي الإعاقات الخاصة", from: 229, to: 242 },
] as const;

export const GUIDE_FIELD_PAGES: Record<string, { from: number; to: number }> =
  Object.fromEntries(GUIDE_FIELDS.map((f) => [f.field, { from: f.from, to: f.to }]));

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  READABLE: "كتاب مقروء",
  AUDIO: "كتاب مسموع",
  VIDEO: "نشرة مرئية",
  IMAGE: "نشرة مصوّرة",
  LINK: "رابط تعليمي",
  OTHER: "مورد آخر",
};

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد المراجعة",
  CONFIRMED: "مؤكّد",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى",
};

export const SESSION_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "قيد الإجابة",
  SUBMITTED: "مكتمل",
  ABANDONED: "غير مكتمل",
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد الإرسال",
  SENT: "تم الإرسال",
  FAILED: "فشل الإرسال",
  SKIPPED: "لم يُرسل",
};

/** مدّة صلاحية رابط النتيجة. */
export const RESULT_TOKEN_DAYS = 90;
