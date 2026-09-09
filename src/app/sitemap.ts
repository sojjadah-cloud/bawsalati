import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/app-url";

const base = appUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, priority: 1 },
    { url: `${base}/assessment`, lastModified: now, priority: 0.9 },
    { url: `${base}/library`, lastModified: now, priority: 0.8 },
    { url: `${base}/booking`, lastModified: now, priority: 0.8 },
    { url: `${base}/guide`, lastModified: now, priority: 0.7 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.3 },
  ];

  try {
    const categories = await prisma.libraryCategory.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    });
    return [
      ...staticRoutes,
      ...categories.map((c) => ({
        url: `${base}/library/${c.slug}`,
        lastModified: c.updatedAt,
        priority: 0.6,
      })),
    ];
  } catch {
    // خريطة الموقع لا يجب أن تفشل لو تعذّر الوصول لقاعدة البيانات
    return staticRoutes;
  }
}
