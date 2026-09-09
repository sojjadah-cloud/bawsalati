// عرض النتيجة: ستة جداول 3×3 ثم جدول التحليل.
// كل القيم تأتي من اللقطة المخزّنة وقت التسليم — لا يُحسب شيء هنا.
import { Check, Minus } from "lucide-react";

export interface ResultCell {
  questionNumber: number;
  text: string;
  value: number;
}

export interface ResultSectionData {
  dimensionCode: string;
  dimensionLabel: string;
  displayOrder: number;
  rawScore: number;
  percentile: number;
  cells: ResultCell[][];
}

export interface AnalysisRowData {
  code: string;
  label: string;
  rawScore: number;
  percentile: number;
  rank: number;
}

/** جدول واحد: 3 أعمدة × 3 صفوف لعبارات محور واحد. */
function SectionTable({ section }: { section: ResultSectionData }) {
  const maxScore = section.cells.flat().length;
  const captionId = `sec-${section.dimensionCode}`;

  return (
    <section className="card p-5" aria-labelledby={captionId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id={captionId} className="text-base font-bold text-slate-900">
          {section.dimensionLabel}
        </h3>
        <span className="badge-brand shrink-0">
          {section.rawScore} من {maxScore}
        </span>
      </div>

      <table className="mt-4 w-full table-fixed border-collapse">
        <caption className="sr-only">
          إجاباتك في محور {section.dimensionLabel}: {section.rawScore} من {maxScore}
        </caption>
        <tbody>
          {section.cells.map((row, r) => (
            <tr key={r}>
              {row.map((cell) => (
                <td key={cell.questionNumber} className="p-1">
                  <div
                    className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] border text-center ${
                      cell.value > 0
                        ? "border-brand-200 bg-brand-50 text-brand-800"
                        : "border-[var(--color-line)] bg-slate-50 text-slate-400"
                    }`}
                  >
                    <span className="text-[11px] font-semibold tabular-nums">
                      {cell.questionNumber}
                    </span>
                    {cell.value > 0 ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                      العبارة {cell.questionNumber}: {cell.value > 0 ? "تنطبق" : "لا تنطبق"}
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-muted)]">الرتبة المئوية</span>
          <span className="font-bold tabular-nums text-slate-900">{section.percentile}٪</span>
        </div>
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
          role="img"
          aria-label={`الرتبة المئوية ${section.percentile} بالمئة`}
        >
          <div
            className="h-full rounded-full bg-brand-600"
            style={{ width: `${section.percentile}%` }}
          />
        </div>
      </div>

      <details className="mt-4 group">
        <summary className="cursor-pointer text-xs font-bold text-brand-700 hover:underline">
          عرض عبارات هذا المحور
        </summary>
        <ol className="mt-2 space-y-1.5">
          {section.cells.flat().map((cell) => (
            <li key={cell.questionNumber} className="flex gap-2 text-xs leading-relaxed">
              <span className="shrink-0 font-bold tabular-nums text-[var(--color-faint)]">
                {cell.questionNumber}.
              </span>
              <span className={cell.value > 0 ? "text-slate-700" : "text-[var(--color-faint)]"}>
                {cell.text}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

export function ResultTables({ sections }: { sections: ResultSectionData[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map((s) => (
        <SectionTable key={s.dimensionCode} section={s} />
      ))}
    </div>
  );
}

export function AnalysisTable({
  rows,
  summary,
}: {
  rows: AnalysisRowData[];
  summary?: string;
}) {
  const ordered = [...rows].sort((a, b) => a.rank - b.rank);

  return (
    <section aria-labelledby="analysis-title">
      <h2 id="analysis-title" className="section-title">
        جدول التحليل
      </h2>
      <p className="section-lead">
        ترتيب محاورك من الأقوى إلى الأقل حسب الرتبة المئوية.
      </p>

      <div className="table-wrap mt-5">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">الترتيب</th>
              <th scope="col">المحور</th>
              <th scope="col">الدرجة الخام</th>
              <th scope="col">الرتبة المئوية</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((row) => (
              <tr key={row.code}>
                <td className="tabular-nums font-bold text-slate-900">{row.rank}</td>
                <td className="font-semibold">{row.label}</td>
                <td className="tabular-nums">{row.rawScore}</td>
                <td className="tabular-nums font-bold text-brand-800">{row.percentile}٪</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary ? (
        <div className="card card-pad mt-5">
          <h3 className="text-base font-bold text-slate-900">أبرز محاورك</h3>
          <ol className="mt-3 space-y-3">
            {summary
              .split("\n")
              .filter(Boolean)
              .map((line, i) => (
                <li key={i} className="text-sm leading-relaxed text-slate-700">
                  {line}
                </li>
              ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
