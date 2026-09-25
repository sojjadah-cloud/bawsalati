import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroBackdrop } from "./HeroBackdrop";

/**
 * ترويسة موحّدة للصفحات الفرعية: شريط بلون الهوية وأشكال ساكنة في الخلفية،
 * ليبدأ كل قسم من المنصة بالشكل نفسه بدل عنوان عارٍ فوق خلفية بيضاء.
 */
export function PageHero({
  title,
  description,
  breadcrumb,
  action,
  back,
}: {
  title: string;
  description?: string;
  /**
   * وجهة الرجوع. مكتوبة لا مأخوذة من تاريخ المتصفّح: الطالب قد يفتح الصفحة
   * برابط مباشر من رسالة، فلا يكون خلفه شيء يرجع إليه.
   */
  back?: { href: string; label: string };
  /** مسار تنقّل يظهر فوق العنوان */
  breadcrumb?: ReactNode;
  /** إجراء واحد يظهر بمحاذاة العنوان على الشاشات الواسعة */
  action?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-800 text-white">
      <HeroBackdrop compact />

      <div className="container-x relative py-10 sm:py-14">
        {back ? (
          <Link
            href={back.href}
            className="no-print absolute top-3 right-4 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] px-2 text-sm font-bold text-brand-100 transition-colors hover:bg-white/10 hover:text-white sm:right-6"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            {back.label}
          </Link>
        ) : null}

        {/* عمود واحد موسّط: العنوان والوصف والإجراء كلها في منتصف الشريط. */}
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          {breadcrumb ? <div className="mb-3">{breadcrumb}</div> : null}
          <h1 className="text-2xl font-bold tracking-tight text-balance text-white sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-sm leading-relaxed text-pretty text-brand-100 sm:text-base">
              {description}
            </p>
          ) : null}

          {action ? <div className="mt-6">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}

/** مسار تنقّل بألوان مناسبة للشريط الداكن. */
export function HeroBreadcrumb({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="مسار التنقّل">
      <ol className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-brand-200">
        {children}
      </ol>
    </nav>
  );
}
