"use client";

// شريط البحث والتصفية. الحالة تعيش في عنوان الصفحة، فالنتائج قابلة للمشاركة والرجوع.
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { RESOURCE_TYPE_LABELS } from "@/lib/constants";

const TYPES = ["READABLE", "AUDIO", "LINK", "OTHER"] as const;

export function LibraryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentQuery = params.get("q") ?? "";
  const currentType = params.get("type") ?? "";

  function apply(next: { q?: string; type?: string }) {
    const sp = new URLSearchParams(params.toString());
    const q = next.q ?? currentQuery;
    const type = next.type ?? currentType;
    if (q) sp.set("q", q);
    else sp.delete("q");
    if (type) sp.set("type", type);
    else sp.delete("type");
    sp.delete("page");
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  return (
    <div className="space-y-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const field = e.currentTarget.elements.namedItem("q");
          apply({ q: field instanceof HTMLInputElement ? field.value.trim() : "" });
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--color-faint)]"
            aria-hidden="true"
          />
          {/* غير مُتحكَّم به عمداً: المفتاح يعيد ضبطه عند تغيّر العنوان. */}
          <input
            key={currentQuery}
            name="q"
            type="search"
            className="input pr-10"
            placeholder="ابحث بالعنوان أو المؤلف"
            aria-label="البحث في المكتبة"
            defaultValue={currentQuery}
          />
          {currentQuery ? (
            <button
              type="button"
              onClick={() => apply({ q: "" })}
              aria-label="مسح البحث"
              className="absolute top-1/2 left-2 -translate-y-1/2 cursor-pointer rounded p-1.5 text-[var(--color-faint)] hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          بحث
        </button>
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية حسب نوع المورد">
        <button
          type="button"
          onClick={() => apply({ type: "" })}
          aria-pressed={!currentType}
          className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
            !currentType
              ? "bg-brand-700 text-white"
              : "border border-[var(--color-line-strong)] bg-white text-slate-600 hover:border-brand-400"
          }`}
        >
          الكل
        </button>
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => apply({ type: currentType === t ? "" : t })}
            aria-pressed={currentType === t}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              currentType === t
                ? "bg-brand-700 text-white"
                : "border border-[var(--color-line-strong)] bg-white text-slate-600 hover:border-brand-400"
            }`}
          >
            {RESOURCE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
