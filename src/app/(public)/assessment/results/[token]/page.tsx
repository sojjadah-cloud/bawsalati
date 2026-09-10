import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, GraduationCap, Printer } from "lucide-react";
import { getResultByToken } from "@/features/assessment/service";
import { GRADE_LABELS } from "@/lib/constants";
import { formatArabicDate } from "@/lib/time";
import { Alert } from "@/components/ui/primitives";
import {
  AnalysisTable,
  InterestCode,
  ResultTables,
  type AnalysisRowData,
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

  const { session, result, programs } = data;
  const sections = result.sections.map((s) => ({
    dimensionCode: s.dimensionCode,
    dimensionLabel: s.dimensionLabel,
    displayOrder: s.displayOrder,
    rawScore: s.rawScore,
    percentile: s.percentile,
    cells: s.cells as unknown as ResultSectionData["cells"],
  }));
  const analysisRows = (result.analysis?.rows ?? []) as unknown as AnalysisRowData[];

  return (
    <div className="container-x py-10 sm:py-14">
      <header className="flex flex-col gap-4 border-b border-[var(--color-line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">نتيجة اختبار بوصلتي</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {session.studentName}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {GRADE_LABELS[session.grade] ?? session.grade}
            {session.submittedAt
              ? ` · ${formatArabicDate(session.submittedAt.toISOString().slice(0, 10))}`
              : null}
          </p>
        </div>
        <Link href="/booking" className="btn-primary no-print shrink-0">
          <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          ناقش نتيجتك مع مختص
        </Link>
      </header>

      <div className="mt-6 no-print">
        <Alert tone="info" title="كيف تقرأ نتيجتك">
          كل جدول بيئة مهنية بعباراتها التسع، والعلامة تعني أنك تفضّل ذلك النشاط.
          الدرجة الخام عدد ما فضّلته منها، وتُحوَّل إلى رتبة مئينية تقارنك بزملاء
          صفّك ونوعك. النتيجة مؤشّر يساعدك على الاختيار، ويعتمدها مختص التوجيه
          المهني بعد مناقشتها معك.
        </Alert>
      </div>

      <section className="mt-10" aria-labelledby="tables-title">
        <h2 id="tables-title" className="section-title">
          جداول البيئات الست
        </h2>

        <div className="mt-5">
          <ResultTables sections={sections} />
        </div>
      </section>

      <div className="mt-12">
        <InterestCode interestCode={result.interestCode} rows={analysisRows} />
      </div>

      <div className="mt-12">
        <AnalysisTable rows={analysisRows} summary={result.analysis?.summary} />
      </div>

      {/* تحليل الأخصائي — يظهر بعد اعتماده النتيجة فقط */}
      {result.approvedAt && (result.specialistNotes || result.recommendation) ? (
        <section className="mt-12" aria-labelledby="specialist-title">
          <h2 id="specialist-title" className="section-title">
            قراءة مختص التوجيه المهني
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

      {result.recommendedFields.length > 0 ? (
        <section className="mt-12" aria-labelledby="fields-title">
          <h2 id="fields-title" className="section-title">
            مجالات دراسية قد تناسبك
          </h2>
          <p className="section-lead">مقترحة بناءً على بيئاتك الثلاث الأعلى. ناقشها مع المختص.</p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {result.recommendedFields.map((f) => (
              <li key={f} className="badge-brand">
                {f}
              </li>
            ))}
          </ul>

          {programs.length > 0 ? (
            <div className="table-wrap mt-6">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">البرنامج</th>
                    <th scope="col">المجال</th>
                    <th scope="col">المؤسسة</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((p) => (
                    <tr key={p.id}>
                      <td className="font-semibold text-slate-900">{p.name}</td>
                      <td>{p.field}</td>
                      <td className="text-[var(--color-muted)]">{p.institution ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
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
