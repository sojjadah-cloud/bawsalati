// عرض النتيجة: ستة جداول 3×3، ثم جدول التحليل، ثم المخطط المهني.
// كل القيم تأتي من اللقطة المخزّنة وقت التسليم — لا يُحسب شيء هنا.
import { Check, Minus } from "lucide-react";
import { ProfileChart } from "./ProfileChart";

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


/** صفحات المقياس الثلاث: كل صفحة ثماني عشرة عبارة. */
const PAGES = [
  { number: 1, from: 1, to: 18 },
  { number: 2, from: 19, to: 36 },
  { number: 3, from: 37, to: 54 },
];

/** أرقام عبارات بيئة في صفحة واحدة، مكتوبةً مدىً: «1–3». */
function rangeIn(section: ResultSectionData, from: number, to: number): string {
  const numbers = section.cells
    .flat()
    .map((c) => c.questionNumber)
    .filter((n) => n >= from && n <= to)
    .sort((a, b) => a - b);
  if (numbers.length === 0) return "—";
  return numbers.length === 1
    ? String(numbers[0])
    : `${numbers[0]}–${numbers[numbers.length - 1]}`;
}

/**
 * توزيع عبارات المقياس على البيئات الست، كما في كرّاسة المقياس:
 * لكل بيئة أرقام عباراتها في صفحات المقياس الثلاث.
 */
export function DistributionTable({ sections }: { sections: ResultSectionData[] }) {
  const ordered = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">
          توزيع عبارات المقياس على البيئات المهنية الست
        </caption>
        <thead>
          <tr>
            <th scope="col">البيئة المهنية</th>
            {PAGES.map((p) => (
              <th key={p.number} scope="col" className="text-center">
                صفحة {p.number}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((s) => (
            <tr key={s.dimensionCode}>
              <th scope="row" className="font-bold text-slate-900">
                {s.dimensionLabel} ({s.dimensionCode})
              </th>
              {PAGES.map((p) => (
                <td key={p.number} className="text-center tabular-nums">
                  {rangeIn(s, p.from, p.to)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** جدول الدرجات: الرمز والدرجة الخام والرتبة المئينية لكل بيئة. */
export function ScoreTable({ sections }: { sections: ResultSectionData[] }) {
  const ordered = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">جدول الدرجات في البيئات الست</caption>
        <thead>
          <tr>
            <th scope="col">البيئة</th>
            {ordered.map((s) => (
              <th key={s.dimensionCode} scope="col" className="text-center">
                {s.dimensionLabel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">الرمز</th>
            {ordered.map((s) => (
              <td key={s.dimensionCode} className="text-center font-bold text-brand-800">
                ({s.dimensionCode})
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">الدرجة الخام</th>
            {ordered.map((s) => (
              <td key={s.dimensionCode} className="text-center font-bold tabular-nums">
                {s.rawScore}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">الرتبة المئينية</th>
            {ordered.map((s) => (
              <td key={s.dimensionCode} className="text-center tabular-nums">
                {s.percentile}٪
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** جدول واحد: 3 أعمدة × 3 صفوف لعبارات بيئة واحدة. */
function SectionTable({
  section,
  showScores,
}: {
  section: ResultSectionData;
  showScores: boolean;
}) {
  const maxScore = section.cells.flat().length;
  const captionId = `sec-${section.dimensionCode}`;

  return (
    <section className="card p-5" aria-labelledby={captionId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={captionId} className="text-base font-bold text-slate-900">
            {section.dimensionLabel} ({section.dimensionCode})
          </h3>
          <p className="mt-0.5 text-xs tabular-nums text-[var(--color-muted)]">
            العبارات {PAGES.map((p) => rangeIn(section, p.from, p.to)).join("، ")}
          </p>
        </div>
        {showScores ? (
          <span className="badge-brand shrink-0">
            {section.rawScore} من {maxScore}
          </span>
        ) : null}
      </div>

      <table className="mt-4 w-full table-fixed border-collapse">
        <caption className="sr-only">
          إجاباتك في بيئة {section.dimensionLabel}
          {showScores ? `: ${section.rawScore} من ${maxScore}` : ""}
        </caption>
        <tbody>
          {section.cells.map((row, r) => (
            <tr key={r}>
              {row.map((cell) => (
                <td key={cell.questionNumber} className="p-1">
                  <div
                    title={`${cell.text} — ${cell.value > 0 ? "أفضّل" : "لا أفضّل"}`}
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
                      العبارة {cell.questionNumber}: {cell.value > 0 ? "أفضّل" : "لا أفضّل"}
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {showScores ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-muted)]">الرتبة المئينية</span>
            <span className="font-bold tabular-nums text-slate-900">{section.percentile}٪</span>
          </div>
          <div
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
            role="img"
            aria-label={`الرتبة المئينية ${section.percentile} بالمئة`}
          >
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${section.percentile}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* كل عبارة مع إجابة الطالب عليها بنصّها، فلا يبقى الجدول أرقاماً مجرّدة.
          الإجابة مكتوبة لا ملوّنة فقط، فتُقرأ على شاشة وعلى ورق ولقارئ الشاشة. */}
      <details className="group mt-4">
        <summary className="cursor-pointer text-xs font-bold text-brand-700 hover:underline">
          عبارات هذه البيئة وإجاباتك عليها ({maxScore})
        </summary>
        <ol className="mt-3 space-y-2">
          {section.cells.flat().map((cell) => (
            <li
              key={cell.questionNumber}
              className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] pb-2 text-xs leading-relaxed last:border-0"
            >
              <span className="flex gap-2">
                <span className="shrink-0 font-bold tabular-nums text-[var(--color-faint)]">
                  {cell.questionNumber}.
                </span>
                <span className="text-slate-700">{cell.text}</span>
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                  cell.value > 0
                    ? "bg-brand-50 text-brand-800"
                    : "bg-slate-100 text-[var(--color-muted)]"
                }`}
              >
                {cell.value > 0 ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {cell.value > 0 ? "أفضّل" : "لا أفضّل"}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

export function ResultTables({
  sections,
  showScores = true,
}: {
  sections: ResultSectionData[];
  /** صفحة الطالب تعرض إجاباته فقط، والدرجات والرتب تبقى للأخصائي */
  showScores?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map((s) => (
        <SectionTable key={s.dimensionCode} section={s} showScores={showScores} />
      ))}
    </div>
  );
}

/** رمز الميول: البيئات الثلاث الأعلى رتبةً مئينية. */
export function InterestCode({
  rows,
}: {
  /** الرمز المخزّن (الثلاث الأعلى) يبقى أساس المجالات المقترحة، والعرض يشمل الست */
  interestCode?: string;
  rows: AnalysisRowData[];
}) {
  const ranked = [...rows].sort((a, b) => a.rank - b.rank);
  if (ranked.length === 0) return null;

  return (
    <section className="card card-pad" aria-labelledby="code-title">
      <h2 id="code-title" className="text-base font-bold text-slate-900">
        رمز ميولك
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        البيئات الست مرتّبة من الأعلى رتبةً مئينية إلى الأدنى. الثلاث الأولى هي
        الأبرز، وعليها يُبنى البحث عن المجالات المناسبة.
      </p>

      <p
        className="mt-4 text-3xl font-extrabold tracking-widest"
        aria-label={ranked.map((r) => r.code).join(" ")}
      >
        {ranked.map((r, i) => (
          <span key={r.code} className={i < 3 ? "text-brand-800" : "text-slate-400"}>
            {i > 0 ? " - " : ""}
            {r.code}
          </span>
        ))}
      </p>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {ranked.map((row, i) => (
          <li
            key={row.code}
            className={`rounded-[var(--radius-md)] p-3 ${
              i < 3 ? "border border-brand-200 bg-brand-50/60" : "bg-slate-50"
            }`}
          >
            <span className="block text-xs text-[var(--color-muted)]">البيئة {row.rank}</span>
            <span className="mt-0.5 block text-sm font-bold text-slate-900">
              {row.label} ({row.code})
            </span>
            <span className="mt-1 block text-xs tabular-nums text-brand-800">
              الرتبة المئينية {row.percentile}
            </span>
          </li>
        ))}
      </ol>
    </section>
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
        ترتيب البيئات من الأقوى إلى الأقل حسب الرتبة المئينية.
      </p>

      <div className="table-wrap mt-5">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">الترتيب</th>
              <th scope="col">البيئة</th>
              <th scope="col">الرمز</th>
              <th scope="col">الدرجة الخام</th>
              <th scope="col">الرتبة المئينية</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((row) => (
              <tr key={row.code}>
                <td className="tabular-nums font-bold text-slate-900">{row.rank}</td>
                <td className="font-semibold">{row.label}</td>
                <td className="font-bold text-brand-800">{row.code}</td>
                <td className="tabular-nums">{row.rawScore} / 9</td>
                <td className="tabular-nums font-bold text-brand-800">{row.percentile}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* المخطط المهني كما في نموذج الدليل: البيئات بترتيبها الأصلي لا بترتيب الرتبة */}
      <div className="mt-6">
        <h3 className="mb-3 text-base font-bold text-slate-900">المخطط المهني</h3>
        <ProfileChart rows={rows} />
      </div>

      {summary ? (
        <div className="card card-pad mt-5">
          <h3 className="text-base font-bold text-slate-900">أبرز بيئاتك</h3>
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
