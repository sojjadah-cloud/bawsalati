import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(2, "أدخل اسم التصنيف").max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/u, "المعرّف: حروف إنجليزية صغيرة وأرقام وشرطات"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

const optionalUrl = z
  .string()
  .trim()
  .max(600)
  .refine(
    (v) => v === "" || /^https:\/\/[^\s]+$/u.test(v),
    "أدخل رابطاً يبدأ بـ https://"
  )
  .optional()
  .or(z.literal(""));

export const resourceSchema = z
  .object({
    categoryId: z.string().trim().min(1, "اختر التصنيف"),
    title: z.string().trim().min(2, "أدخل العنوان").max(250),
    description: z.string().trim().max(3000).optional().or(z.literal("")),
    type: z.enum(["READABLE", "AUDIO", "LINK", "OTHER"], {
      errorMap: () => ({ message: "اختر نوع المورد" }),
    }),
    author: z.string().trim().max(160).optional().or(z.literal("")),
    publisher: z.string().trim().max(160).optional().or(z.literal("")),
    publishedYear: z
      .preprocess(
        (v) => (v === "" || v === null || v === undefined ? undefined : v),
        z.coerce.number().int().min(1900).max(2100).optional()
      )
      .optional(),
    language: z.string().trim().max(20).optional().or(z.literal("")),
    coverUrl: optionalUrl,
    externalUrl: optionalUrl,
    fileId: z.string().trim().max(60).optional().or(z.literal("")),
    audioFileId: z.string().trim().max(60).optional().or(z.literal("")),
    downloadable: z.boolean().optional(),
    featured: z.boolean().optional(),
    published: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "LINK" && !v.externalUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalUrl"],
        message: "الرابط مطلوب لهذا النوع",
      });
    }
    // المقروء والمسموع يجوز تسجيلهما في الفهرس قبل توفّر النسخة:
    // صفحة المورد تعرض حينها «مُدرَج في الفهرس» وتدعو الطالب لسؤال المختص.
    // أما المورد من نوع رابط فلا معنى له بلا رابط، ولذلك بقي شرطه أعلاه.
  });

export type ResourceInput = z.infer<typeof resourceSchema>;
