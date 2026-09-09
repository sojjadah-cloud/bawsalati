"use client";

// شريط تصفية عام للوحات. الحالة في عنوان الصفحة، فالرابط قابل للمشاركة والرجوع.
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

export interface SelectFilter {
  name: string;
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
}

export function FilterBar({
  searchPlaceholder = "ابحث بالاسم",
  selects = [],
  dateFields = [],
}: {
  searchPlaceholder?: string;
  selects?: SelectFilter[];
  dateFields?: { name: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const currentQuery = params.get("q") ?? "";

  function push(sp: URLSearchParams) {
    sp.delete("page");
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  function setParam(name: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(name, value);
    else sp.delete(name);
    push(sp);
  }

  const hasFilters = [...params.keys()].some((k) => k !== "page");

  return (
    <div className="card card-pad">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const field = e.currentTarget.elements.namedItem("q");
          const value = field instanceof HTMLInputElement ? field.value.trim() : "";
          setParam("q", value);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--color-faint)]"
            aria-hidden="true"
          />
          {/* غير مُتحكَّم به عمداً: المفتاح يعيد ضبطه عند تغيّر العنوان،
              فلا حاجة لمزامنة الحالة داخل تأثير. */}
          <input
            key={currentQuery}
            name="q"
            type="search"
            className="input pr-10"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            defaultValue={currentQuery}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          بحث
        </button>
      </form>

      {selects.length > 0 || dateFields.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {selects.map((s) => (
            <label key={s.name} className="block">
              <span className="label">{s.label}</span>
              <select
                className="select"
                value={params.get(s.name) ?? ""}
                onChange={(e) => setParam(s.name, e.target.value)}
              >
                <option value="">{s.placeholder}</option>
                {s.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {dateFields.map((d) => (
            <label key={d.name} className="block">
              <span className="label">{d.label}</span>
              <input
                type="date"
                className="input"
                value={params.get(d.name) ?? ""}
                onChange={(e) => setParam(d.name, e.target.value)}
              />
            </label>
          ))}
        </div>
      ) : null}

      {hasFilters ? (
        <button
          type="button"
          onClick={() => startTransition(() => router.push(pathname))}
          className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[var(--color-muted)] hover:text-brand-700"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          إزالة كل عوامل التصفية
        </button>
      ) : null}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  className = "",
}: {
  page: number;
  totalPages: number;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (totalPages <= 1) return null;

  function go(n: number) {
    const sp = new URLSearchParams(params.toString());
    if (n > 1) sp.set("page", String(n));
    else sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <nav aria-label="صفحات النتائج" className={`flex items-center justify-center gap-2 ${className}`}>
      <button type="button" className="btn-outline btn-sm" onClick={() => go(page - 1)} disabled={page <= 1}>
        السابق
      </button>
      <span className="px-2 text-sm text-[var(--color-muted)]">
        صفحة {page} من {totalPages}
      </span>
      <button
        type="button"
        className="btn-outline btn-sm"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
      >
        التالي
      </button>
    </nav>
  );
}
