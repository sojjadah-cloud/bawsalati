import type { ReactNode } from "react";
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
}: {
  title: string;
  description?: string;
  /** مسار تنقّل يظهر فوق العنوان */
  breadcrumb?: ReactNode;
  /** إجراء واحد يظهر بمحاذاة العنوان على الشاشات الواسعة */
  action?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-800 text-white">
      <HeroBackdrop compact />

      <div className="container-x relative py-10 sm:py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {breadcrumb ? <div className="mb-3">{breadcrumb}</div> : null}
            <h1 className="text-2xl font-bold tracking-tight text-balance text-white sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-pretty text-brand-100 sm:text-base">
                {description}
              </p>
            ) : null}
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}

/** مسار تنقّل بألوان مناسبة للشريط الداكن. */
export function HeroBreadcrumb({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="مسار التنقّل">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-brand-200">{children}</ol>
    </nav>
  );
}
