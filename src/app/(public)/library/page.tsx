import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpenText, Library } from "lucide-react";
import { listCategories } from "@/features/library/service";
import { EmptyState } from "@/components/ui/primitives";
import { PageHero } from "@/components/public/PageHero";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "المكتبة الرقمية",
  description: "كتب ومراجع ونشرات في التوجيه المهني وتنمية المهارات الشخصية.",
};

export default async function LibraryPage() {
  const all = await listCategories();

  const totalResources = all.reduce((n, c) => n + c.resourceCount, 0);
  // التصنيف الفارغ لا يُعرض للطالب: نقرةٌ تنتهي إلى لا شيء. يبقى في لوحة
  // الأخصائي كما هو، ويظهر للطلاب فور نشر أوّل مورد فيه.
  const categories = all.filter((c) => c.resourceCount > 0);

  return (
    <>
      <PageHero
        back={{ href: "/", label: "رجوع إلى الرئيسية" }}
        title="المكتبة الرقمية"
        description="كتب ومراجع ونشرات في التوجيه المهني وتنمية المهارات — تصفّحها داخل المنصة أو نزّلها."
      />

      <div className="container-x py-10 sm:py-14">
      {totalResources === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Library className="h-6 w-6" />}
            title="المكتبة قيد الإعداد"
            description="لم تُنشر موارد بعد. احجز موعداً مع أخصائي التوجيه المهني للحصول على مراجع تناسبك."
            action={
              <Link href="/booking" className="btn-primary">
                احجز موعداً
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/library/${c.slug}`}
                  className="card card-interactive group flex h-full flex-col p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-brand-50 text-brand-700">
                    <BookOpenText className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-lg font-bold text-slate-900">{c.name}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
                    {c.description}
                  </p>
                  <span className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-[var(--color-faint)]">
                      {c.resourceCount === 0
                        ? "لا توجد موارد بعد"
                        : `${c.resourceCount} مورداً`}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-brand-700">
                      تصفّح
                      <ArrowLeft
                        className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

        </>
      )}
      </div>
    </>
  );
}
