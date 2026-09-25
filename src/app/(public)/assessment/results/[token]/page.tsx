import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarCheck, GraduationCap, Printer } from "lucide-react";
import { getResultByToken } from "@/features/assessment/service";
import { GRADE_LABELS } from "@/lib/constants";
import { formatArabicDate } from "@/lib/time";
import {
  DistributionTable,
  ResultTables,
  ScoreTable,
  type ResultSectionData,
} from "@/components/assessment/ResultView";

// نتيجة طالب — لا تُفهرس ولا تُخزَّن.
export const metadata: Metadata = {
  title: "نتيجتك",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getResultByToken(decodeURIComponent(token));

  if (!data) notFound();

  const { session, result } = data;
  const sections = result.sections.map((s) => ({
    dimensionCode: s.dimensionCode,
    dimensionLabel: s.dimensionLabel,
    displayOrder: s.displayOrder,
    rawScore: s.rawScore,
    percentile: s.percentile,
    cells: s.cells as unknown as ResultSectionData["cells"],
  }));

  return (
    <div className="container-x py-10 sm:py-14">
      <Link
        href="/"
        className="no-print mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] px-2 text-sm font-bold text-brand-800 transition-colors hover:bg-brand-50"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        رجوع إلى الرئيسية
      </Link>

      <header className="flex flex-col items-center border-b border-[var(--color-line)] pb-6 text-center">
        <p className="section-kicker">نتيجة مقياس السمات والميول المهنية</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {session.studentName}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {GRADE_LABELS[session.grade] ?? session.grade}
          {session.submittedAt
            ? ` · ${formatArabicDate(session.submittedAt.toISOString().slice(0, 10))}`
            : null}
        </p>
        <Link href="/booking" className="btn-primary no-print mt-5">
          <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          ناقش نتيجتك مع أخصائي
        </Link>
      </header>

      <section className="mt-10" aria-labelledby="tables-title">
        <h2 id="tables-title" className="section-title">
          إجاباتك في البيئات الست
        </h2>
        <p className="section-lead">
          هذه إجاباتك كما سجّلتها. يقرؤها أخصائي التوجيه المهني ويحلّلها معك.
        </p>

        <div className="mt-5">
          <ResultTables sections={sections} showScores={false} />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="scores-title">
        <h2 id="scores-title" className="section-title">
          جدول الدرجات
        </h2>
        <p className="section-lead">
          درجتك الخام في كل بيئة ورتبتها المئينية، يقرؤها معك أخصائي التوجيه المهني.
        </p>
        <div className="mt-5">
          <ScoreTable sections={sections} />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="dist-title">
        <h2 id="dist-title" className="section-title">
          توزيع عبارات المقياس على البيئات الست
        </h2>
        <p className="section-lead">أرقام العبارات في صفحات المقياس الثلاث.</p>
        <div className="mt-5">
          <DistributionTable sections={sections} />
        </div>
      </section>

      {/* تحليل الأخصائي — يظهر بعد اعتماده النتيجة فقط */}
      {result.approvedAt && (result.specialistNotes || result.recommendation) ? (
        <section className="mt-12" aria-labelledby="specialist-title">
          <h2 id="specialist-title" className="section-title">
            قراءة أخصائي التوجيه المهني
          </h2>
          <div className="card card-pad mt-5 space-y-5">
            {result.specialistNotes ? (
              <div>
                <h3 className="text-sm font-bold text-slate-900">التحليل</h3>
                <p className="mt-2 text-sm leading-loose whitespace-pre-line text-slate-700">
                  {result.specialistNotes}
                </p>
              </div>
            ) : null}

            {result.recommendation ? (
              <div>
                <h3 className="text-sm font-bold text-slate-900">التوصيات والمهن المقترحة</h3>
                <p className="mt-2 text-sm leading-loose whitespace-pre-line text-slate-700">
                  {result.recommendation}
                </p>
              </div>
            ) : null}

            <p className="border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-faint)]">
              اعتُمدت النتيجة في {result.approvedAt.toISOString().slice(0, 10)}
            </p>
          </div>
        </section>
      ) : null}

      <div className="no-print mt-12 flex flex-wrap gap-3 border-t border-[var(--color-line)] pt-6">
        <Link href="/guide" className="btn-outline">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
          اقرأ دليل الطالب
        </Link>
        <Link href="/library" className="btn-outline">
          استكشف المكتبة الرقمية
        </Link>
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-faint)]">
          <Printer className="h-4 w-4" aria-hidden="true" />
          يمكنك طباعة هذه الصفحة أو حفظها بصيغة PDF من متصفّحك
        </span>
      </div>
    </div>
  );
}
