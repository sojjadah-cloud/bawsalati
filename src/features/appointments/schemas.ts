import { z } from "zod";
import { GRADES } from "@/lib/constants";
import { isValidHhMm, isValidIsoDate } from "@/lib/time";
import { phoneSchema, studentNameSchema } from "@/features/assessment/schemas";

const gradeValues = GRADES.map((g) => g.value) as [string, ...string[]];

export const isoDate = z
  .string()
  .trim()
  .refine(isValidIsoDate, "تاريخ غير صحيح");

export const hhmm = z.string().trim().refine(isValidHhMm, "وقت غير صحيح");

export const createAppointmentSchema = z
  .object({
    specialistId: z.string().trim().min(1, "اختر المختص"),
    studentName: studentNameSchema,
    grade: z.enum(gradeValues, { errorMap: () => ({ message: "اختر الصف الدراسي" }) }),
    phone: phoneSchema,
    date: isoDate,
    startTime: hhmm,
    topicId: z.string().trim().min(1, "اختر موضوع الاستشارة"),
    topicDetails: z.string().trim().max(1000, "التفاصيل طويلة جداً").optional().or(z.literal("")),
  })
  .strict();

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const appointmentNotesSchema = z.object({
  specialistNotes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const availabilitySchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: hhmm,
    endTime: hhmm,
    slotMinutes: z.coerce.number().int().min(10).max(180),
    active: z.boolean().optional(),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "وقت النهاية يجب أن يكون بعد وقت البداية",
    path: ["endTime"],
  });

export const blockedDateSchema = z
  .object({
    date: isoDate,
    fullDay: z.boolean().default(true),
    startTime: hhmm.optional().or(z.literal("")),
    endTime: hhmm.optional().or(z.literal("")),
    reason: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((v) => v.fullDay || (v.startTime && v.endTime && v.startTime < v.endTime), {
    message: "حدّد فترة صحيحة أو اختر اليوم كاملاً",
    path: ["endTime"],
  });

export const topicSchema = z.object({
  name: z.string().trim().min(2, "أدخل اسم الموضوع").max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/u, "المعرّف: حروف إنجليزية صغيرة وأرقام وشرطات"),
  requiresDetails: z.boolean().optional(),
  displayOrder: z.coerce.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});
