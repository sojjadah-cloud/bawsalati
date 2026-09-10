// نصوص وثوابت الواجهة العربية.

export const BRAND = {
  name: "بوصلتي",
  tagline: "منصة التوجيه المهني",
  description:
    "منصة التوجيه المهني: اختبار ميول، مكتبة رقمية، دليل الطالب، وموعد مع مختص.",
  email: "bawsalati@soharboys.edu.om",
  phone: "+968 92549426",
  location: "سلطنة عُمان — صحار",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  SPECIALIST: "مختص التوجيه المهني",
};

export const GRADES = [
  { value: "9", label: "الصف التاسع" },
  { value: "10", label: "الصف العاشر" },
  { value: "11", label: "الصف الحادي عشر" },
  { value: "12", label: "الصف الثاني عشر" },
] as const;

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

/** مدّة صلاحية رابط النتيجة. */
export const RESULT_TOKEN_DAYS = 90;
