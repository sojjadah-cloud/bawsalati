// ═══════════════════════════════════════════════════════════════
// لمن يُعرض البرنامج: الجنس وفئة الاستحقاق.
//
// الدليل يقصر بعض البرامج على أحد الجنسين، ويخصّص بعضها لأسر الضمان
// الاجتماعي أو ذوي الدخل المحدود أو الطلبة ذوي الإعاقة. هذه القراءة تُستعمل
// في الخادم لتصفية النتائج، وفي الواجهة لعرض الخيارات، فلا تعتمد على Prisma.
// ═══════════════════════════════════════════════════════════════

/** فئة البرامج المفتوحة للجميع كما تُكتب في الدليل. */
export const OPEN_TO_ALL = "جميع الطلبة";

/**
 * الفئات الخاصة. برامجها لا تُعرض إلا لمن قال إنه منها، فلا يبني الطالب
 * أملاً على مقعدٍ ليس له، ولا تُحجب عنه مقاعدُه إن كان من أهلها.
 */
export const SUPPORT_CATEGORIES = [
  {
    key: "socialSecurity",
    eligibility: "ضمان اجتماعي",
    label: "من أسر الضمان الاجتماعي",
    hint: "برامج مخصّصة لأبناء المستفيدين من الضمان الاجتماعي",
  },
  {
    key: "limitedIncome",
    eligibility: "دخل محدود",
    label: "من ذوي الدخل المحدود",
    hint: "برامج مخصّصة لأبناء الأسر ذات الدخل المحدود",
  },
  {
    key: "disability",
    eligibility: "الطلبة ذوي الإعاقة",
    label: "من الطلبة ذوي الإعاقة",
    hint: "برامج مخصّصة للطلبة ذوي الإعاقة",
  },
] as const;

export type SupportKey = (typeof SUPPORT_CATEGORIES)[number]["key"];
export type Support = Partial<Record<SupportKey, boolean>>;
export type Gender = "MALE" | "FEMALE";

export interface Audience {
  /** يُستعمل لإخفاء البرامج المقصورة على الجنس الآخر */
  gender?: Gender;
  /** الفئات التي قال الطالب إنه منها */
  support?: Support;
}

/**
 * الجنس المقصور عليه البرنامج، مكتوبٌ في اسمه كما في الدليل:
 * «الهندسة (للذكور فقط)» و«تصميم الأزياء (للإناث فقط)».
 * واسمٌ يذكر الجنسين — «تقنيات الزراعة (ذكور/ إناث)» — ليس مقصوراً على أحدهما.
 */
export function programGender(name: string): Gender | null {
  const male = /ذكور/u.test(name);
  const female = /[إأا]ناث/u.test(name);
  if (male === female) return null;
  return male ? "MALE" : "FEMALE";
}

/** هل هذا البرنامج معروضٌ لطالبٍ بهذه الصفات؟ */
export function offeredTo(
  program: { name: string; eligibility: string },
  audience: Audience
): boolean {
  if (audience.gender) {
    const only = programGender(program.name);
    if (only && only !== audience.gender) return false;
  }

  const category = program.eligibility.trim();
  if (!category || category === OPEN_TO_ALL) return true;

  const match = SUPPORT_CATEGORIES.find((c) => c.eligibility === category);
  // فئة غير معروفة تبقى ظاهرة: الإخفاء بلا أساسٍ يحجب فرصةً عن صاحبها
  if (!match) return true;
  return audience.support?.[match.key] === true;
}
