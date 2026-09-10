import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireSpecialist } from "@/lib/api";
import { getSubmissionDetail } from "@/features/specialist/service";
import { GENDER_LABELS, GRADE_LABELS } from "@/lib/constants";
import { formatArabicDate, utcToIsoDate } from "@/lib/time";
import {
  AnalysisTable,
  InterestCode,
  ResultTables,
  type AnalysisRowData,
  type ResultSectionData,
} from "@/components/assessment/ResultView";
import { SpecialistAnalysis } from "@/components/assessment/SpecialistAnalysis";

export const metadata: Metadata = {
  title: "تفاصيل الاختبار",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSpecialist();
  const { id } = await params;
  const detail = await getSubmissionDetail(id);
  if (!detail) notFound();

  const { session, result, answers } = detail;
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
    <>
      <Link
        href="/specialist/assessments"
        className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--color-muted)] hover:text-brand-700"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        العودة إلى النتائج
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
        {session.studentName}
      </h1>

      {/* بيانات الطالب */}
      <dl className="card card-pad mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "الصف", value: GRADE_LABELS[session.grade] ?? session.grade },
          { label: "النوع", value: GENDER_LABELS[session.gender] ?? session.gender },
          { label: "رقم التواصل", value: session.phone, ltr: true },
          {
            label: "تاريخ الإكمال",
            value: session.submittedAt ? formatArabicDate(utcToIsoDate(session.submittedAt)) : "—",
          },
          {
            label: "إصدار قواعد التصحيح",
            value: `v${result.ruleSet.version} · ${result.assessmentVersion}`,
          },
        ].map((row) => (
          <div key={row.label}>
            <dt className="text-xs text-[var(--color-muted)]">{row.label}</dt>
            <dd
              className="mt-0.5 text-sm font-bold text-slate-900"
              dir={row.ltr ? "ltr" : undefined}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* جداول النتيجة */}
      <section className="mt-8" aria-labelledby="sec-tables">
        <h2 id="sec-tables" className="text-lg font-bold text-slate-900">
          جداول البيئات الست
        </h2>
        <div className="mt-4">
          <ResultTables sections={sections} />
        </div>
      </section>

      {/* التحليل */}
      <div className="mt-10">
        <InterestCode interestCode={result.interestCode} rows={analysisRows} />
      </div>

      <div className="mt-10">
        <AnalysisTable rows={analysisRows} summary={result.analysis?.summary} />
      </div>

      {result.recommendedFields.length > 0 ? (
        <section className="mt-8" aria-labelledby="sec-fields">
          <h2 id="sec-fields" className="text-lg font-bold text-slate-900">
            مجالات دراسية مقترحة
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {result.recommendedFields.map((f) => (
              <li key={f} className="badge-brand">
                {f}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* تحليل الأخصائي واعتماد النتيجة */}
      <div className="mt-10">
        <SpecialistAnalysis
          sessionId={session.id}
          initialNotes={result.specialistNotes ?? ""}
          initialRecommendation={result.recommendation ?? ""}
          approvedAt={result.approvedAt ? result.approvedAt.toISOString() : null}
          approvedByName={result.approvedBy?.name ?? null}
        />
      </div>

      {/* كل الإجابات */}
      <section className="mt-10" aria-labelledby="sec-answers">
        <h2 id="sec-answers" className="text-lg font-bold text-slate-900">
          إجابات الطالب ({answers.length} عبارة)
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          مرتّبة برقم العبارة، مع الدفعة والبيئة التي تنتمي إليها.
        </p>

        <div className="table-wrap mt-4">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="w-12">#</th>
                <th scope="col">العبارة</th>
                <th scope="col" className="w-20">الدفعة</th>
                <th scope="col" className="w-32">البيئة</th>
                <th scope="col" className="w-24">الإجابة</th>
              </tr>
            </thead>
            <tbody>
              {answers.map((a) => (
                <tr key={a.question.number}>
                  <td className="tabular-nums text-[var(--color-faint)]">{a.question.number}</td>
                  <td className="min-w-64">{a.question.text}</td>
                  <td className="tabular-nums">{a.question.group.number}</td>
                  <td className="text-xs">{a.question.dimension.label}</td>
                  <td>
                    <span className={a.value > 0 ? "badge-success" : "badge-neutral"}>
                      {a.value > 0 ? "أفضّل" : "لا أفضّل"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
