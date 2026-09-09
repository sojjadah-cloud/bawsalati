// دليل الطالب — يُدار من لوحة المدير، فتغييره لا يتطلب إعادة بناء الواجهة.
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const guideSchema = z.object({
  title: z.string().trim().min(2, "أدخل عنوان الدليل").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  fileId: z.string().trim().max(60).optional().or(z.literal("")),
  externalUrl: z
    .string()
    .trim()
    .max(600)
    .refine((v) => v === "" || /^https:\/\/[^\s]+$/u.test(v), "أدخل رابطاً يبدأ بـ https://")
    .optional()
    .or(z.literal("")),
  downloadable: z.boolean().optional(),
  published: z.boolean().optional(),
});

export type GuideInput = z.infer<typeof guideSchema>;

/** النسخة المنشورة الحالية (الأحدث إصداراً). */
export async function getPublishedGuide() {
  return prisma.guideDocument.findFirst({
    where: { published: true },
    orderBy: { version: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      downloadable: true,
      externalUrl: true,
      version: true,
      publishedAt: true,
      updatedAt: true,
      file: { select: { storageKey: true, mimeType: true, size: true } },
    },
  });
}

export async function listGuideVersions() {
  return prisma.guideDocument.findMany({
    orderBy: { version: "desc" },
    select: {
      id: true,
      title: true,
      version: true,
      published: true,
      downloadable: true,
      externalUrl: true,
      publishedAt: true,
      updatedAt: true,
      fileId: true,
    },
  });
}

/** إصدار جديد يُنشر ويُلغى نشر ما قبله، في معاملة واحدة. */
export async function publishGuideVersion(input: GuideInput, userId: string) {
  const latest = await prisma.guideDocument.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;
  const publish = input.published !== false;

  return prisma.$transaction(async (tx) => {
    if (publish) {
      await tx.guideDocument.updateMany({
        where: { published: true },
        data: { published: false },
      });
    }
    return tx.guideDocument.create({
      data: {
        title: input.title,
        description: input.description || "",
        fileId: input.fileId || null,
        externalUrl: input.externalUrl || null,
        downloadable: input.downloadable ?? true,
        published: publish,
        publishedAt: publish ? new Date() : null,
        version,
        createdById: userId,
      },
      select: { id: true, version: true },
    });
  });
}
