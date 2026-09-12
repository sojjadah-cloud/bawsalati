import Link from "next/link";
import { X } from "lucide-react";
import type { Facet, ProgramFilters as Filters } from "@/features/programs/service";
import { NO_INSTITUTION } from "@/features/programs/service";

/**
 * يبني رابط الصفحة من التصفية المطلوبة، ويُسقط ما بعدها من مستويات.
 * `showAll` يعني: لا تضيق أكثر، اعرض نتائج ما اخترته الآن.
 */
export function buildHref(filters: Filters, showAll = false): string {
  const q = new URLSearchParams();
  if (filters.field) q.set("field", filters.field);
  if (filters.programType) q.set("type", filters.programType);
  if (filters.institution) q.set("inst", filters.institution);
  if (showAll) q.set("all", "1");
  const qs = q.toString();
  return qs ? `/guide?${qs}` : "/guide";
}

/** خطوة تصفية واحدة: عنوانها وخياراتها المتاحة فعلاً. */
export function FilterStep({
  step,
  title,
  hint,
  options,
  selected,
  hrefFor,
  allLabel,
  allHref,
}: {
  step: number;
  title: string;
  hint?: string;
  options: Facet[];
  selected?: string;
  hrefFor: (value: string) => string;
  /** خيار «الكل» في هذه المرحلة: يعرض النتائج بلا تضييق أكثر */
  allLabel?: string;
  allHref?: string;
}) {
  if (options.length === 0) return null;
  const total = options.reduce((n, o) => n + o.count, 0);

  return (
    <section aria-labelledby={`step-${step}`} className="card card-pad">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`step-${step}`} className="flex items-center gap-2 text-base font-bold text-slate-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
            {step}
          </span>
          {title}
        </h2>
        {hint ? <p className="text-xs text-[var(--color-muted)]">{hint}</p> : null}
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {allLabel && allHref ? (
          <li>
            <Link
              href={allHref}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-brand-400 bg-brand-50/60 px-3 text-sm font-bold text-brand-800 transition-colors hover:bg-brand-100"
            >
              <span>{allLabel}</span>
              <span className="rounded-full bg-white/70 px-1.5 text-xs font-semibold text-brand-700">
                {total}
              </span>
            </Link>
          </li>
        ) : null}
        {options.map((o) => {
          const isSelected = selected === o.value;
          return (
            <li key={o.value}>
              <Link
                href={hrefFor(isSelected ? "" : o.value)}
                aria-current={isSelected ? "true" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border px-3 text-sm font-bold transition-colors ${
                  isSelected
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-[var(--color-line)] bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"
                }`}
              >
                <span>{o.value === NO_INSTITUTION ? "بدون مؤسسة محدّدة" : o.value}</span>
                <span
                  className={`rounded-full px-1.5 text-xs font-semibold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {o.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** شريط يوضّح اختيار الطالب، وكل عنصر فيه يُزال بضغطة. */
export function FilterChips({ filters }: { filters: Filters }) {
  // إزالة مستوى تُسقط ما بعده: لا معنى لمؤسسة بلا مجال.
  const chips = [
    filters.field ? { label: filters.field, href: buildHref({}) } : null,
    filters.programType
      ? { label: filters.programType, href: buildHref({ field: filters.field }) }
      : null,
    filters.institution
      ? {
          label: filters.institution === NO_INSTITUTION ? "بدون مؤسسة محدّدة" : filters.institution,
          href: buildHref({ field: filters.field, programType: filters.programType }),
        }
      : null,
  ].filter(Boolean) as { label: string; href: string }[];

  if (chips.length === 0) return null;

  return (
    <nav aria-label="التصفية المطبَّقة" className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-50 px-3 text-sm font-bold text-brand-800 transition-colors hover:bg-brand-100"
        >
          {c.label}
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">إزالة هذه التصفية</span>
        </Link>
      ))}
      <Link href="/guide" className="btn-ghost btn-sm">
        مسح الكل
      </Link>
    </nav>
  );
}
