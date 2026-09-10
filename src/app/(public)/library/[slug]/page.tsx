import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ResourceType } from "@prisma/client";
import { BookOpen, ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { listPublicResources } from "@/features/library/service";
import { EmptyState } from "@/components/ui/primitives";
import { ResourceCard } from "@/components/library/ResourceCard";
import { LibraryFilters } from "@/components/library/LibraryFilters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
const VALID_TYPES: ResourceType[] = ["READABLE", "AUDIO", "LINK", "OTHER"];

async function getCategory(slug: string) {
  return prisma.libraryCategory.findFirst({
    where: { slug, active: true },
    select: { id: true, name: true, description: true, slug: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "التصنيف غير موجود" };
  return {
    title: category.name,
    description: category.description || `موارد ${category.name} في مكتبة بوصلتي الرقمية.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await getCategory(slug);
  if (!category) notFound();

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const type = VALID_TYPES.includes(sp.type as ResourceType)
    ? (sp.type as ResourceType)
    : undefined;
  const search = sp.q?.trim() || undefined;

  const { items, total } = await listPublicResources({
    categorySlug: slug,
    type,
    search,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (n: number) => {
    const q = new URLSearchParams();
    if (search) q.set("q", search);
    if (type) q.set("type", type);
    if (n > 1) q.set("page", String(n));
    const qs = q.toString();
    return `/library/${slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="container-x py-10 sm:py-14">
      <nav aria-label="مسار التنقّل" className="mb-4">
        <ol className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
          <li>
            <Link href="/library" className="transition-colors hover:text-brand-700">
              المكتبة الرقمية
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronLeft className="h-4 w-4" />
          </li>
          <li className="font-semibold text-slate-700">{category.name}</li>
        </ol>
      </nav>

      <h1 className="section-title">{category.name}</h1>
      {category.description ? <p className="section-lead">{category.description}</p> : null}

      <div className="mt-6">
        <LibraryFilters />
      </div>

      <p className="mt-5 text-sm text-[var(--color-muted)]" aria-live="polite">
        {total === 0 ? "لا توجد نتائج" : `${total} مورداً`}
      </p>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title={search || type ? "لا توجد نتائج مطابقة" : "لا توجد موارد في هذا التصنيف بعد"}
            description={
              search || type
                ? "جرّب كلمات بحث أخرى أو أزل التصفية."
                : "لم تُضف موارد إلى هذا التصنيف بعد."
            }
            action={
              search || type ? (
                <Link href={`/library/${slug}`} className="btn-outline">
                  إزالة التصفية
                </Link>
              ) : (
                <Link href="/library" className="btn-outline">
                  العودة للتصنيفات
                </Link>
              )
            }
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav aria-label="صفحات النتائج" className="mt-10 flex items-center justify-center gap-2">
          {page > 1 ? (
            <Link href={buildHref(page - 1)} className="btn-outline btn-sm">
              السابق
            </Link>
          ) : null}
          <span className="px-3 text-sm text-[var(--color-muted)]">
            صفحة {page} من {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={buildHref(page + 1)} className="btn-outline btn-sm">
              التالي
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
