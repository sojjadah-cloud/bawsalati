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
