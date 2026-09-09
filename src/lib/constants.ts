// نصوص وثوابت الواجهة العربية.

export const BRAND = {
  name: "بوصلتي",
  tagline: "منصة التوجيه المهني",
  description:
    "منصة تساعد الطالب على اكتشاف ميوله المهنية، والوصول إلى مكتبة رقمية، وحجز استشارة مع مختص التوجيه المهني.",
  email: "bawsalati@soharboys.edu.om",
  phone: "+968 92549426",
  location: "سلطنة عُمان — صحار",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  SPECIALIST: "مختص التوجيه المهني",
};

export const GRADES = [
  { value: "10", label: "الصف العاشر" },
  { value: "11", label: "الصف الحادي عشر" },
  { value: "12", label: "الصف الثاني عشر" },
] as const;

export const GRADE_LABELS: Record<string, string> = Object.fromEntries(
  GRADES.map((g) => [g.value, g.label])
);

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  READABLE: "كتاب مقروء",
  AUDIO: "كتاب مسموع",
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

/** إشعارات الخصوصية المعروضة قبل جمع أي بيانات شخصية. */
export const PRIVACY = {
  assessment:
    "نجمع اسمك وصفّك ورقم تواصلك لربط نتيجتك بك وحدك، ولتتمكّن من متابعتها مع مختص التوجيه المهني. لا تُنشر النتيجة ولا تُشارك مع أي جهة خارج المدرسة.",
  booking:
    "نجمع اسمك وصفّك ورقم هاتفك لتأكيد موعدك والتواصل معك بشأنه فقط. يصل المختص إشعار بالحجز، وتبقى تفاصيله داخل حسابه المحمي.",
  consentLabel: "أوافق على استخدام بياناتي لهذا الغرض",
};

/** مدّة صلاحية رابط النتيجة. */
export const RESULT_TOKEN_DAYS = 90;
