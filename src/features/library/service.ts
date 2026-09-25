// خدمة المكتبة الرقمية.
// الاستعلامات العامة لا تُعيد مفاتيح التخزين ولا مسارات الملفات إطلاقاً.
import type { Prisma, ResourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** الحقول الآمنة للعرض العام. */
const publicSelect = {
  id: true,
  title: true,
  description: true,
  type: true,
  author: true,
  publisher: true,
  publishedYear: true,
  language: true,
  coverUrl: true,
  externalUrl: true,
  downloadable: true,
  featured: true,
  createdAt: true,
  category: { select: { id: true, slug: true, name: true } },
  // وجود ملف فقط — لا المفتاح
  fileId: true,
  audioFileId: true,
  coverFileId: true,
} satisfies Prisma.LibraryResourceSelect;

type RawResource = Prisma.LibraryResourceGetPayload<{ select: typeof publicSelect }>;

export interface PublicResource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  author: string;
  publisher: string | null;
  publishedYear: number | null;
  language: string;
  coverUrl: string | null;
  externalUrl: string | null;
  downloadable: boolean;
  featured: boolean;
  hasFile: boolean;
  hasAudio: boolean;
  /** غلاف مولَّد من الملف، يُقدَّم من المنصة نفسها */
  hasCover: boolean;
  category: { id: string; slug: string; name: string };
  createdAt: Date;
}

function toPublic(r: RawResource): PublicResource {
  const { fileId, audioFileId, coverFileId, ...rest } = r;
  return { ...rest, hasFile: !!fileId, hasAudio: !!audioFileId, hasCover: !!coverFileId };
}

export async function listCategories(includeCounts = true) {
  const categories = await prisma.libraryCategory.findMany({
    where: { active: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      ...(includeCounts
        ? {
            _count: {
              select: {
                resources: { where: { published: true, archivedAt: null } },
              },
            },
          }
        : {}),
    },
  });
  return categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    resourceCount: "_count" in c ? c._count.resources : 0,
  }));
}

export interface ResourceFilters {
  categorySlug?: string;
  type?: ResourceType;
  search?: string;
  featuredOnly?: boolean;
  skip?: number;
  take?: number;
}

export async function listPublicResources(filters: ResourceFilters) {
  const where: Prisma.LibraryResourceWhereInput = {
    published: true,
    archivedAt: null,
    ...(filters.categorySlug ? { category: { slug: filters.categorySlug } } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.featuredOnly ? { featured: true } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { author: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.libraryResource.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      skip: filters.skip ?? 0,
      take: filters.take ?? 24,
      select: publicSelect,
    }),
    prisma.libraryResource.count({ where }),
  ]);

  return { items: rows.map(toPublic), total };
}

export async function getPublicResource(id: string): Promise<PublicResource | null> {
  const row = await prisma.libraryResource.findFirst({
    where: { id, published: true, archivedAt: null },
    select: publicSelect,
  });
  return row ? toPublic(row) : null;
}

/** زيادة عدّاد المشاهدة دون إبطاء الاستجابة. */
export function touchResource(id: string): void {
  prisma.libraryResource
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);
}

/**
 * بيانات تقديم الملف. تُستدعى فقط من مسار محمي بمنطق الصلاحيات،
 * وتُعيد مفتاح التخزين الداخلي الذي لا يصل إلى المتصفح أبداً.
 */
export async function getResourceFile(
  resourceId: string,
  which: "file" | "audio" | "cover"
) {
  const resource = await prisma.libraryResource.findFirst({
    where: { id: resourceId, archivedAt: null },
    select: {
      id: true,
      title: true,
      published: true,
      downloadable: true,
      file: { select: { storageKey: true, mimeType: true, size: true } },
      audioFile: { select: { storageKey: true, mimeType: true, size: true } },
      coverFile: { select: { storageKey: true, mimeType: true, size: true } },
    },
  });
  if (!resource) return null;
  const file =
    which === "audio" ? resource.audioFile : which === "cover" ? resource.coverFile : resource.file;
  if (!file) return null;
  return { resource, file };
}

/** قائمة الإدارة — تشمل غير المنشور والمؤرشف. */
export async function listManagedResources(filters: {
  search?: string;
  categoryId?: string;
  includeArchived?: boolean;
  skip?: number;
  take?: number;
}) {
  const where: Prisma.LibraryResourceWhereInput = {
    ...(filters.includeArchived ? {} : { archivedAt: null }),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { author: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.libraryResource.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: filters.skip ?? 0,
      take: filters.take ?? 20,
      select: {
        id: true,
        title: true,
        author: true,
        type: true,
        published: true,
        featured: true,
        downloadable: true,
        archivedAt: true,
        viewCount: true,
        updatedAt: true,
        fileId: true,
        audioFileId: true,
        coverFileId: true,
        externalUrl: true,
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.libraryResource.count({ where }),
  ]);

  return { items, total };
}
