import type { Metadata } from "next";
import { requireSpecialist } from "@/lib/api";
import { listEntries, listUnanswered } from "@/features/faq/service";
import { PageHeading } from "@/components/ui/primitives";
import { FilterBar, Pagination } from "@/components/dashboard/FilterBar";
import { FaqManager } from "@/components/dashboard/FaqManager";

export const metadata: Metadata = {
  title: "بنك أسئلة اسألني",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function SpecialistFaqPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireSpecialist();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const [{ items, total }, unanswered] = await Promise.all([
    listEntries({
      search: sp.q?.trim() || undefined,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    listUnanswered(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeading
        title="بنك أسئلة اسألني"
        description="الأسئلة التي يجيب عنها «اسألني» للطلاب. «اسألني» لا يؤلّف إجابة، بل يعرض ما تكتبه هنا."
      />

      <div className="mt-5">
        <FilterBar searchPlaceholder="ابحث في الأسئلة والأجوبة" />
      </div>

      <p className="mt-5 text-sm text-[var(--color-muted)]" aria-live="polite">
        {total === 0 ? "لا توجد أسئلة" : `${total} سؤالاً`}
      </p>

      <div className="mt-4">
        <FaqManager
          entries={items}
          unanswered={unanswered.map((u) => ({
            id: u.id,
            text: u.text,
            askCount: u.askCount,
          }))}
        />
      </div>

      <Pagination page={page} totalPages={totalPages} className="mt-8" />
    </>
  );
}
