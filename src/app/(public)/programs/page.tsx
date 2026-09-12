import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import {
  browseFacets,
  listPrograms,
  searchPrograms,
  programCount,
  type ProgramFilters as Filters,
} from "@/features/programs/service";
import { EmptyState } from "@/components/ui/primitives";
import { PageHero } from "@/components/public/PageHero";
import { ProgramSearch } from "@/components/programs/ProgramSearch";
import { ProgramCard } from "@/components/programs/ProgramCard";
import { FilterChips, FilterStep, buildHref } from "@/components/programs/ProgramFilters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export const metadata: Metadata = {
  title: "دليل التخصصات والبرامج",
  description:
    "تصفّح برامج الدراسة بعد الثانوية حسب المجال الأكاديمي ونوع البرنامج والمؤسسة التعليمية، أو ابحث برمز البرنامج مباشرة.",
};

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ field?: string; type?: string; inst?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() || "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const filters: Filters = {
    field: sp.field?.trim() || undefined,
    programType: sp.type?.trim() || undefined,
    institution: sp.inst?.trim() || undefined,
  };

  const total = await programCount();

  // البحث بالرمز يتجاوز التصفية كلها: من يعرف الرمز لا يمرّ بالخطوات
  if (query) {
    const results = await searchPrograms(query, 48);
    return (
      <>
        <PageHero
          title="دليل التخصصات والبرامج"
          description={`${total} برنامجاً دراسياً من دليل الطالب، مرتّبة حسب المجال ونوع البرنامج والمؤسسة.`}
        />
        <div className="container-x py-10 sm:py-14">
          <ProgramSearch initial={query} />

          <p className="mt-6 text-sm text-[var(--color-muted)]" aria-live="polite">
            {results.length === 0
              ? `لا نتائج لـ «${query}»`
              : `${results.length} نتيجة لـ «${query}»`}
          </p>

          {results.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<GraduationCap className="h-6 w-6" />}
                title="لم نجد برنامجاً بهذا الرمز أو الاسم"
                description="تأكّد من كتابة الرمز كما ورد في الدليل، أو تصفّح البرامج حسب المجال الأكاديمي."
                action={
                  <Link href="/programs" className="btn-primary">
                    تصفّح كل البرامج
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((p) => (
                <ProgramCard key={p.id} program={p} />
              ))}
            </ul>
          )}
        </div>
      </>
    );
  }

  const [{ fields, types, institutions }, { items, total: matched }] = await Promise.all([
    browseFacets(filters),
    listPrograms(filters, page, PAGE_SIZE),
  ]);

  const hasFilter = Boolean(filters.field || filters.programType || filters.institution);
  const totalPages = Math.max(1, Math.ceil(matched / PAGE_SIZE));

  const pageHref = (n: number) => {
    const base = buildHref(filters);
    if (n <= 1) return base;
    return `${base}${base.includes("?") ? "&" : "?"}page=${n}`;
  };

  return (
    <>
      <PageHero
        title="دليل التخصصات والبرامج"
        description={`${total} برنامجاً دراسياً من دليل الطالب، مرتّبة حسب المجال ونوع البرنامج والمؤسسة.`}
      />

      <div className="container-x py-10 sm:py-14">
        <ProgramSearch />

        <div className="mt-6 space-y-4">
          <FilterStep
            step={1}
            title="اختر المجال الأكاديمي"
            options={fields}
            selected={filters.field}
            hrefFor={(value) => buildHref({ field: value || undefined })}
          />

          {filters.field ? (
            <FilterStep
              step={2}
              title="اختر نوع البرنامج"
              hint="تظهر الأنواع المتوفّرة في هذا المجال فقط"
              options={types}
              selected={filters.programType}
              hrefFor={(value) => buildHref({ field: filters.field, programType: value || undefined })}
            />
          ) : null}

          {filters.field && filters.programType ? (
            <FilterStep
              step={3}
              title="اختر المؤسسة التعليمية"
              hint="تظهر المؤسسات التي لديها برامج مطابقة فقط"
              options={institutions}
              selected={filters.institution}
              hrefFor={(value) =>
                buildHref({
                  field: filters.field,
                  programType: filters.programType,
                  institution: value || undefined,
                })
              }
            />
          ) : null}
        </div>

        {hasFilter ? (
          <div className="mt-6">
            <FilterChips filters={filters} />
          </div>
        ) : null}

        <p className="mt-6 text-sm font-bold text-slate-900" aria-live="polite">
          {matched === 0 ? "لا توجد برامج مطابقة" : `${matched} برنامجاً`}
          {!hasFilter ? (
            <span className="font-normal text-[var(--color-muted)]">
              {" "}
              — اختر مجالاً أعلاه لتضييق النتائج
            </span>
          ) : null}
        </p>

        {items.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<GraduationCap className="h-6 w-6" />}
              title="لا توجد برامج بهذه التصفية"
              description="أزل أحد عناصر التصفية أو ابدأ من جديد."
              action={
                <Link href="/programs" className="btn-outline">
                  مسح التصفية
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav aria-label="صفحات النتائج" className="mt-10 flex items-center justify-center gap-3">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="btn-outline btn-sm">
                السابق
              </Link>
            ) : null}
            <span className="text-sm text-[var(--color-muted)]">
              صفحة {page} من {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="btn-outline btn-sm">
                التالي
              </Link>
            ) : null}
          </nav>
        ) : null}

        <p className="mt-10 text-xs leading-relaxed text-[var(--color-muted)]">
          المصدر: دليل الطالب الصادر عن مركز القبول الموحد، صفحات 74–242. كل برنامج يحمل رقم
          صفحته في الدليل للتحقّق منه. الشروط والمواعيد تتغيّر سنوياً، فراجع الدليل وناقش خيارك
          مع مختص التوجيه المهني قبل التقديم.
        </p>
      </div>
    </>
  );
}
