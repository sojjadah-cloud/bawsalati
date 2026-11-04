import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/app-url";

const base = appUrl();

/**
 * خريطة الموقع.
 *
 * الصفحات الثابتة قليلة، وثقل المنصة في صفحاتها المولّدة: ستّمئة برنامج
 * دراسي وعشرات الكتب. وهذه ما يبحث عنه الطالب فعلاً («شروط القبول في
 * الهندسة الميكانيكية»)، فإن لم تُدرَج لم تُفهرَس.
 *
 * ولا تفشل الخريطة إن تعذّرت القاعدة: صفحاتٌ ناقصة خيرٌ من خريطةٍ ساقطة.
 */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/assessment`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/eligibility`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/library`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/booking`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/guide`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ask`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const dynamic: MetadataRoute.Sitemap = [];

  try {
    const categories = await prisma.libraryCategory.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    });
    for (const c of categories) {
      dynamic.push({
        url: `${base}/library/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    /* القاعدة بعيدة — تُترك أقسام المكتبة */
  }

  try {
    const resources = await prisma.libraryResource.findMany({
      where: { published: true },
      select: { id: true, updatedAt: true },
    });
    for (const r of resources) {
      dynamic.push({
        url: `${base}/library/resource/${r.id}`,
        lastModified: r.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    /* القاعدة بعيدة — تُترك الكتب */
  }

  try {
    const programs = await prisma.studyProgram.findMany({
      where: { active: true },
      select: { code: true, updatedAt: true },
    });
    for (const p of programs) {
      dynamic.push({
        url: `${base}/programs/${encodeURIComponent(p.code)}`,
        lastModified: p.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    /* القاعدة بعيدة — تُترك البرامج */
  }

  return [...staticRoutes, ...dynamic];
}
