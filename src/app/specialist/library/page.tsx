import type { Metadata } from "next";
import { BookOpenText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSpecialist } from "@/lib/api";
import { listManagedResources } from "@/features/library/service";
import { RESOURCE_TYPE_LABELS } from "@/lib/constants";
import { Badge, EmptyState, PageHeading } from "@/components/ui/primitives";
import { FilterBar, Pagination } from "@/components/dashboard/FilterBar";
import { ResourceEditor, type ResourceDraft } from "@/components/dashboard/ResourceEditor";
import { ResourceRowActions } from "@/components/dashboard/ResourceRowActions";

export const metadata: Metadata = {
  title: "إدارة المكتبة الرقمية",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function SpecialistLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; archived?: string; page?: string }>;
}) {
  await requireSpecialist();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const categories = await prisma.libraryCategory.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true },
  });

  const { items, total } = await listManagedResources({
    search: sp.q?.trim() || undefined,
    categoryId: sp.category || undefined,
    includeArchived: sp.archived === "1",
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeading
        title="إدارة المكتبة الرقمية"
        description="أضف الموارد وعدّلها وتحكّم في نشرها وتنزيلها."
        action={<ResourceEditor categories={categories} />}
      />

      <div className="mt-5">
        <FilterBar
          searchPlaceholder="ابحث بالعنوان أو المؤلف"
          selects={[
            {
              name: "category",
              label: "التصنيف",
              placeholder: "كل التصنيفات",
              options: categories.map((c) => ({ value: c.id, label: c.name })),
            },
            {
              name: "archived",
              label: "الأرشيف",
              placeholder: "بدون المؤرشف",
              options: [{ value: "1", label: "إظهار المؤرشف" }],
            },
          ]}
        />
      </div>

      <p className="mt-5 text-sm text-[var(--color-muted)]" aria-live="polite">
        {total === 0 ? "لا توجد موارد" : `${total} مورداً`}
      </p>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<BookOpenText className="h-6 w-6" />}
            title="لا توجد موارد مطابقة"
            description="أضف مورداً جديداً ليظهر للطلاب في المكتبة الرقمية."
            action={<ResourceEditor categories={categories} />}
          />
        </div>
      ) : (
        <div className="table-wrap mt-4">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">العنوان</th>
                <th scope="col">التصنيف</th>
                <th scope="col">النوع</th>
                <th scope="col">الحالة</th>
                <th scope="col">المشاهدات</th>
                <th scope="col">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const draft: ResourceDraft = {
                  id: r.id,
                  categoryId: r.category.id,
                  title: r.title,
                  description: "",
                  type: r.type,
                  author: r.author,
                  publisher: "",
                  publishedYear: "",
                  externalUrl: r.externalUrl ?? "",
                  fileId: r.fileId ?? "",
                  audioFileId: r.audioFileId ?? "",
                  coverFileId: r.coverFileId ?? "",
                  downloadable: r.downloadable,
                  published: r.published,
                };
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="block font-bold text-slate-900">{r.title}</span>
                      {r.author ? (
                        <span className="block text-xs text-[var(--color-muted)]">{r.author}</span>
                      ) : null}
                    </td>
                    <td className="text-xs">{r.category.name}</td>
                    <td className="text-xs">{RESOURCE_TYPE_LABELS[r.type]}</td>
                    <td>
                      {r.archivedAt ? (
                        <Badge tone="neutral">مؤرشف</Badge>
                      ) : r.published ? (
                        <Badge tone="success">منشور</Badge>
                      ) : (
                        <Badge tone="warning">مسودّة</Badge>
                      )}
                    </td>
                    <td className="tabular-nums">{r.viewCount}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <ResourceEditor
                          categories={categories}
                          initial={draft}
                          trigger="link"
                        />
                        <ResourceRowActions
                          resourceId={r.id}
                          title={r.title}
                          published={r.published}
                          archived={!!r.archivedAt}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} className="mt-8" />
    </>
  );
}
