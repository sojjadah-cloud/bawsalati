import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, GraduationCap } from "lucide-react";
import { getPublishedGuide } from "@/features/guide/service";
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
  title: "دليل الطالب",
  description:
    "تصفّح التخصصات والبرامج الدراسية حسب المجال ونوع البرنامج والمؤسسة، أو ابحث برمز البرنامج مباشرة.",
};

export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{
    field?: string;
    type?: string;
    inst?: string;
    q?: string;
    page?: string;
    all?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() || "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const showAll = sp.all === "1";

  const filters: Filters = {
    field: sp.field?.trim() || undefined,
    programType: sp.type?.trim() || undefined,
    institution: sp.inst?.trim() || undefined,
  };

  const [guide, total] = await Promise.all([getPublishedGuide(), programCount()]);

  const searchResults = query ? await searchPrograms(query, 48) : null;
  const browse = query
    ? null
    : await Promise.all([browseFacets(filters), listPrograms(filters, page, PAGE_SIZE)]);

  const hasFilter = Boolean(filters.field || filters.programType || filters.institution);
  /**
   * النتائج لا تُعرض حتى يصل الطالب إلى آخر مرحلة أو يطلب «الكل» صراحةً،
   * فلا تُغرقه مئات البطاقات قبل أن يحدّد ما يريد.
   */
  const reachedEnd = Boolean(
    filters.institution ||
      (filters.field && filters.programType && browse && browse[0].institutions.length === 0)
  );
  const showResults = showAll || reachedEnd;
  const matched = browse ? browse[1].total : 0;
  const totalPages = Math.max(1, Math.ceil(matched / PAGE_SIZE));

  const pageHref = (n: number) => {
    const base = buildHref(filters, showAll);
    if (n <= 1) return base;
    return `${base}${base.includes("?") ? "&" : "?"}page=${n}`;
  };

  return (
    <>
      <PageHero
        back={{ href: "/", label: "رجوع إلى الرئيسية" }}
        title={guide?.title ?? "دليل الطالب"}
        description={`${total} برنامجاً دراسياً من الدليل الرسمي، مرتّبة حسب المجال ونوع البرنامج والمؤسسة.`}
        action={
          guide?.file ? (
            /* يُفتح في تبويب جديد ليقرأه الطالب في مكانه، ومن أراد حفظه حفظه من متصفّحه */
            <a
              href="/api/files/guide"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <ExternalLink className="h-5 w-5" aria-hidden="true" />
              افتح الدليل
            </a>
          ) : undefined
        }
      />

      <div className="container-x py-10 sm:py-14">
        {/* ابحث أولاً: من يعرف رمز برنامجه لا يحتاج شيئاً آخر */}
        <ProgramSearch initial={query} />

        {searchResults ? (
          <>
            <p className="mt-6 text-sm text-[var(--color-muted)]" aria-live="polite">
              {searchResults.length === 0
                ? `لا نتائج لـ «${query}»`
                : `${searchResults.length} نتيجة لـ «${query}»`}
            </p>

            {searchResults.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={<GraduationCap className="h-6 w-6" />}
                  title="لم نجد برنامجاً بهذا الرمز أو الاسم"
                  description="تأكّد من كتابة الرمز كما ورد في الدليل، أو تصفّح البرامج حسب المجال الأكاديمي."
                  action={
                    <Link href="/guide" className="btn-primary">
                      تصفّح كل البرامج
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((p) => (
                  <ProgramCard key={p.id} program={p} />
                ))}
              </ul>
            )}
          </>
        ) : browse ? (
          <>
            <div className="mt-6 space-y-4">
              <FilterStep
                step={1}
                title="اختر المجال الأكاديمي"
                hint="أو اعرض كل البرامج دفعةً واحدة"
                options={browse[0].fields}
                selected={filters.field}
                hrefFor={(value) => buildHref({ field: value || undefined })}
                allLabel="إظهار الكل"
                changeLabel="المجال"
                allHref={buildHref({}, true)}
              />

              {filters.field ? (
                <FilterStep
                  step={2}
                  title="اختر نوع البرنامج"
                  hint="تظهر الأنواع المتوفّرة في هذا المجال فقط"
                  options={browse[0].types}
                  selected={filters.programType}
                  hrefFor={(value) =>
                    buildHref({ field: filters.field, programType: value || undefined })
                  }
                  allLabel="إظهار الكل في هذا المجال"
                  changeLabel="النوع"
                  allHref={buildHref({ field: filters.field }, true)}
                />
              ) : null}

              {filters.field && filters.programType ? (
                <FilterStep
                  step={3}
                  title="اختر المؤسسة التعليمية"
                  hint="تظهر المؤسسات التي لديها برامج مطابقة فقط"
                  options={browse[0].institutions}
                  selected={filters.institution}
                  hrefFor={(value) =>
                    buildHref({
                      field: filters.field,
                      programType: filters.programType,
                      institution: value || undefined,
                    })
                  }
                  allLabel="إظهار الكل في هذا النوع"
                  changeLabel="المؤسسة"
                  allHref={buildHref(
                    { field: filters.field, programType: filters.programType },
                    true
                  )}
                />
              ) : null}
            </div>

            {hasFilter ? (
              <div className="mt-6">
                <FilterChips filters={filters} />
              </div>
            ) : null}

            {!showResults ? (
              <p className="mt-6 text-sm leading-relaxed text-[var(--color-muted)]">
                {matched} برنامجاً ضمن اختيارك حتى الآن. أكمل الخطوة التالية لتصل إلى ما
                تريده بالضبط، أو اضغط «إظهار الكل» في أي مرحلة لعرضها الآن.
              </p>
            ) : null}

            {showResults ? (
            <>
            <p className="mt-6 text-sm font-bold text-slate-900" aria-live="polite">
              {matched === 0 ? "لا توجد برامج مطابقة" : `${matched} برنامجاً`}
            </p>

            {browse[1].items.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={<GraduationCap className="h-6 w-6" />}
                  title="لا توجد برامج بهذه التصفية"
                  description="أزل أحد عناصر التصفية أو ابدأ من جديد."
                  action={
                    <Link href="/guide" className="btn-outline">
                      مسح التصفية
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {browse[1].items.map((p) => (
                  <ProgramCard key={p.id} program={p} />
                ))}
              </ul>
            )}

            {totalPages > 1 ? (
              <nav
                aria-label="صفحات النتائج"
                className="mt-10 flex items-center justify-center gap-3"
              >
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
            </>
            ) : null}
          </>
        ) : null}

      </div>
    </>
  );
}
