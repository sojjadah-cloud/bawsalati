import type { Metadata } from "next";
import { CalendarDays, Eye, TrendingUp, Users } from "lucide-react";
import { requireAdmin } from "@/lib/api";
import { visitStats } from "@/features/analytics/visits";
import { EmptyState, PageHeading, StatCard } from "@/components/ui/primitives";
import { VisitsChart } from "@/components/admin/VisitsChart";

export const metadata: Metadata = {
  title: "زوّار المنصة",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** أسماء الصفحات كما يعرفها الأخصائي، لا مساراتها. */
const PAGE_NAMES: Record<string, string> = {
  "/": "الصفحة الرئيسة",
  "/assessment": "مقياس الميول",
  "/eligibility": "اعرف تخصصك",
  "/guide": "دليل الطالب",
  "/library": "المكتبة الرقمية",
  "/booking": "حجز موعد",
  "/ask": "اسألني",
  "/privacy": "إشعار الخصوصية",
};

function pageName(path: string): string {
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  if (path.startsWith("/programs/")) return `برنامج ${path.slice("/programs/".length)}`;
  if (path.startsWith("/library/resource/")) return "كتاب في المكتبة";
  if (path.startsWith("/library/")) return `قسم ${path.slice("/library/".length)}`;
  return path;
}

const ar = new Intl.NumberFormat("ar-OM");

export default async function VisitsPage() {
  await requireAdmin();
  const stats = await visitStats();

  const hasData = stats.totalViews > 0;

  return (
    <div className="space-y-6">
      <PageHeading
        title="زوّار المنصة"
        description="عدد من زار المنصة وما زاروه. لا يُحفظ عن الزائر شيءٌ يعرّفه: لا عنوان ولا كوكي."
      />

      {!hasData ? (
        <EmptyState
          title="لا زيارات مسجّلة بعد"
          description="يبدأ العدّ من أول زيارة بعد تفعيل الإحصاء. عُد بعد قليل."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="زوّار اليوم"
              value={ar.format(stats.todayVisitors)}
              icon={<Users className="h-5 w-5" aria-hidden="true" />}
              hint={`${ar.format(stats.todayViews)} مشاهدة`}
            />
            <StatCard
              label="آخر سبعة أيام"
              value={ar.format(stats.weekVisitors)}
              icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
              hint="زائراً مختلفاً"
            />
            <StatCard
              label="آخر ثلاثين يوماً"
              value={ar.format(stats.monthVisitors)}
              icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
              hint="زائراً مختلفاً"
            />
            <StatCard
              label="الإجمالي"
              value={ar.format(stats.totalVisitors)}
              icon={<Eye className="h-5 w-5" aria-hidden="true" />}
              hint={`${ar.format(stats.totalViews)} مشاهدة${
                stats.since ? ` منذ ${stats.since}` : ""
              }`}
            />
          </div>

          <section className="card card-pad">
            <h2 className="text-base font-bold text-slate-900">الزوّار يوماً بيوم</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">آخر ثلاثين يوماً</p>
            <div className="mt-4">
              <VisitsChart data={stats.daily} />
            </div>
          </section>

          <section className="card card-pad">
            <h2 className="text-base font-bold text-slate-900">أكثر الصفحات زيارة</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-right">
                    <th className="pb-2 font-semibold text-[var(--color-muted)]">الصفحة</th>
                    <th className="pb-2 font-semibold text-[var(--color-muted)]">زوّار</th>
                    <th className="pb-2 font-semibold text-[var(--color-muted)]">مشاهدات</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topPages.map((p) => (
                    <tr key={p.path} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-2.5 font-medium text-slate-800">{pageName(p.path)}</td>
                      <td className="py-2.5 tabular-nums text-slate-700">
                        {ar.format(p.visitors)}
                      </td>
                      <td className="py-2.5 tabular-nums text-slate-700">{ar.format(p.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <p className="text-xs leading-relaxed text-[var(--color-faint)]">
        يُحتسب الزائر مرةً واحدة في اليوم مهما تنقّل بين الصفحات. ولا تُحسب زيارات محرّكات
        البحث وبرامج الفحص الآلي. والبصمة المستعملة للتمييز تتبدّل كل ليلة، فلا يُتتبّع
        زائرٌ من يومٍ إلى يوم.
      </p>
    </div>
  );
}
