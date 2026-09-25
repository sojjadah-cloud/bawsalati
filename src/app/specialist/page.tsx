import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CalendarDays, ClipboardList, Inbox } from "lucide-react";
import { requireSpecialist } from "@/lib/api";
import { getDashboardSummary } from "@/features/specialist/service";
import { APPOINTMENT_STATUS_LABELS, GRADE_LABELS } from "@/lib/constants";
import { formatArabicDate, formatArabicTime, utcToIsoDate } from "@/lib/time";
import { Badge, EmptyState, PageHeading, StatCard, type BadgeTone } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "لوحة الأخصائي",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  CONFIRMED: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export default async function SpecialistHome() {
  const session = await requireSpecialist();
  const summary = await getDashboardSummary(session.specialistId);

  return (
    <>
      <PageHeading
        title={`أهلاً، ${session.name}`}
        description="ملخّص سريع لما يحتاج انتباهك اليوم."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="اختبارات جديدة"
          value={summary.newAssessments}
          hint="خلال آخر 7 أيام"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          label="مواعيد اليوم"
          value={summary.todayCount}
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <StatCard
          label="مواعيد قادمة"
          value={summary.upcoming}
          icon={<CalendarClock className="h-5 w-5" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent-assessments">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-assessments" className="text-base font-bold text-slate-900">
              أحدث الاختبارات
            </h2>
            <Link href="/specialist/assessments" className="text-sm font-bold text-brand-700 hover:underline">
              عرض الكل
            </Link>
          </div>

          {summary.recentAssessments.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title="لا توجد اختبارات مكتملة بعد"
              description="ستظهر هنا فور إكمال الطلاب للاختبار."
            />
          ) : (
            <ul className="card divide-y divide-[var(--color-line)]">
              {summary.recentAssessments.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/specialist/assessments/${a.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {a.studentName}
                      </span>
                      <span className="block text-xs text-[var(--color-muted)]">
                        {GRADE_LABELS[a.grade] ?? a.grade}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--color-faint)]">
                      {a.submittedAt ? utcToIsoDate(a.submittedAt) : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-appointments">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-appointments" className="text-base font-bold text-slate-900">
              المواعيد القادمة
            </h2>
            <Link href="/specialist/appointments" className="text-sm font-bold text-brand-700 hover:underline">
              عرض الكل
            </Link>
          </div>

          {summary.recentAppointments.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="لا توجد مواعيد قادمة"
              description="تأكّد من إتاحة أوقات في صفحة الأوقات المتاحة ليتمكّن الطلاب من الحجز."
              action={
                <Link href="/specialist/availability" className="btn-outline btn-sm">
                  إدارة الأوقات
                </Link>
              }
            />
          ) : (
            <ul className="card divide-y divide-[var(--color-line)]">
              {summary.recentAppointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900">
                      {a.studentName}
                    </span>
                    <span className="block truncate text-xs text-[var(--color-muted)]">
                      {formatArabicDate(utcToIsoDate(a.scheduledDate))} ·{" "}
                      {formatArabicTime(a.startTime)} · {a.topic.name}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                      {APPOINTMENT_STATUS_LABELS[a.status]}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
