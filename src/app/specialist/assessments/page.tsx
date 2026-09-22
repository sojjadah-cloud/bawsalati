import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireSpecialist } from "@/lib/api";
import { listSubmissions } from "@/features/specialist/service";
import { GRADES, GRADE_LABELS } from "@/lib/constants";
import { utcToIsoDate } from "@/lib/time";
import { EmptyState, PageHeading } from "@/components/ui/primitives";
import { FilterBar, Pagination } from "@/components/dashboard/FilterBar";

export const metadata: Metadata = {
  title: "نتائج الاختبارات",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    grade?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  await requireSpecialist();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const sort = sp.sort === "oldest" || sp.sort === "name" ? sp.sort : "newest";

  const { items, total } = await listSubmissions({
    search: sp.q?.trim() || undefined,
    grade: sp.grade || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
    sort,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeading
        title="نتائج الاختبارات"
        description="سجلّات الطلاب الذين أكملوا مقياس السمات والميول المهنية."
      />

      <div className="mt-5">
        <FilterBar
          searchPlaceholder="ابحث باسم الطالب"
          selects={[
            {
              name: "grade",
              label: "الصف",
              placeholder: "كل الصفوف",
              options: GRADES.map((g) => ({ value: g.value, label: g.label })),
            },
            {
              name: "sort",
              label: "الترتيب",
              placeholder: "الأحدث أولاً",
              options: [
                { value: "oldest", label: "الأقدم أولاً" },
                { value: "name", label: "حسب الاسم" },
              ],
            },
          ]}
          dateFields={[
            { name: "from", label: "من تاريخ" },
            { name: "to", label: "إلى تاريخ" },
          ]}
        />
      </div>

      <p className="mt-5 text-sm text-[var(--color-muted)]" aria-live="polite">
        {total === 0 ? "لا توجد سجلات" : `${total} سجلاً`}
      </p>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="لا توجد اختبارات مطابقة"
            description="جرّب تعديل عوامل التصفية، أو انتظر إكمال الطلاب للاختبار."
          />
        </div>
      ) : (
        <div className="table-wrap mt-4">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">الطالب</th>
                <th scope="col">الصف</th>
                <th scope="col">رقم التواصل</th>
                <th scope="col">تاريخ الإكمال</th>
                <th scope="col">أبرز المحاور</th>
                <th scope="col">
                  <span className="sr-only">إجراء</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="font-bold text-slate-900">{s.studentName}</td>
                  <td>{GRADE_LABELS[s.grade] ?? s.grade}</td>
                  <td className="tabular-nums" dir="ltr">
                    {s.phone}
                  </td>
                  <td className="tabular-nums whitespace-nowrap">
                    {s.submittedAt ? utcToIsoDate(s.submittedAt) : "—"}
                  </td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      {(s.result?.topDimensions ?? []).map((code) => (
                        <span key={code} className="badge-brand">
                          {code}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td>
                    <Link href={`/specialist/assessments/${s.id}`} className="btn-outline btn-sm">
                      عرض التفاصيل
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} className="mt-8" />
    </>
  );
}
