import { z } from "zod";
import { GRADES } from "@/lib/constants";

const gradeValues = GRADES.map((g) => g.value) as [string, ...string[]];

/** الهاتف العُماني: 8 أرقام تبدأ بـ 7 أو 9. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[79]\d{7}$/u, "أدخل رقماً عُمانياً صحيحاً مكوّناً من 8 أرقام");

export const studentNameSchema = z
  .string()
  .trim()
  .min(3, "أدخل الاسم كاملاً")
  .max(120, "الاسم طويل جداً")
  .regex(/^[\p{Script=Arabic}\p{L}\s'.-]+$/u, "الاسم يجب أن يحتوي حروفاً فقط");

export const startSessionSchema = z.object({
  studentName: studentNameSchema,
  grade: z.enum(gradeValues, { errorMap: () => ({ message: "اختر الصف الدراسي" }) }),
  phone: phoneSchema,
  consent: z.literal(true, {
    errorMap: () => ({ message: "يلزم الموافقة على إشعار الخصوصية للمتابعة" }),
  }),
});
export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const saveAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1),
        value: z.number().int().min(0).max(10),
      })
    )
    .min(1, "لا توجد إجابات لحفظها")
    .max(60, "عدد الإجابات أكبر من المتوقع"),
});
export type SaveAnswersInput = z.infer<typeof saveAnswersSchema>;

export const submitSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: "أكّد إرسال الإجابات" }),
  }),
});
