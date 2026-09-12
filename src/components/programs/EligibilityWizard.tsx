"use client";

// «أي تخصص أستطيع دخوله؟»
// الصفّ أولاً، ثم المواد، ثم النتيجة. طالب الحادي عشر والثاني عشر يدخل
// درجاته أيضاً فيُحتسب معدّله التنافسي لكل برنامج كما ينصّ الدليل.
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, TriangleAlert } from "lucide-react";
import { api, messageOf } from "@/lib/client";
import { GRADES, SUBJECTS } from "@/lib/constants";
import { Alert, EmptyState } from "@/components/ui/primitives";

type Subject = (typeof SUBJECTS)[number];

interface SubjectRule {
  min: number;
  anyOf: Subject[];
  count: number;
}

interface ProgramMatch {
  id: string;
  code: string;
  name: string;
  field: string;
  programType: string;
  institution: string;
  country: string;
  guidePage: number | null;
  minOverall: number | null;
  competitive: number | null;
  unmetRules: SubjectRule[];
  overallMet: boolean;
  eligible: boolean;
}

interface MatchResult {
  eligible: ProgramMatch[];
  nearMisses: ProgramMatch[];
  fields: { field: string; count: number }[];
  overall: number | null;
  unchecked: number;
}

/** الصفّان الحادي عشر والثاني عشر يدخلان الدرجات، وما دونهما المواد فقط. */
const GRADES_WITH_MARKS = ["11", "12"];

export function EligibilityWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [grade, setGrade] = useState("");
  const [chosen, setChosen] = useState<Subject[]>([]);
  const [marks, setMarks] = useState<Partial<Record<Subject, string>>>({});
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsMarks = GRADES_WITH_MARKS.includes(grade);

  function toggle(subject: Subject) {
    setChosen((list) =>
      list.includes(subject) ? list.filter((s) => s !== subject) : [...list, subject]
    );
    setMarks((m) => {
      const next = { ...m };
      if (subject in next) delete next[subject];
      return next;
    });
  }

  const ready = needsMarks
    ? chosen.length > 0 && chosen.every((s) => {
        const v = Number(marks[s]);
        return marks[s] !== undefined && marks[s] !== "" && v >= 0 && v <= 100;
      })
    : chosen.length > 0;

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const body = needsMarks
        ? { grade, marks: chosen.map((s) => ({ subject: s, mark: Number(marks[s]) })) }
        : { grade, subjects: chosen };
      const data = await api.post<MatchResult>("/api/eligibility", body);
      setResult(data);
      setStep(3);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setStep(1);
    setGrade("");
    setChosen([]);
    setMarks({});
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center justify-center gap-2 text-sm">
        {[
          { n: 1, label: "الصف" },
          { n: 2, label: needsMarks ? "المواد والدرجات" : "المواد" },
          { n: 3, label: "التخصصات المتاحة" },
        ].map((s) => (
          <li
            key={s.n}
            aria-current={step === s.n ? "step" : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold ${
              step === s.n ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            <span className="tabular-nums">{s.n}</span>
            {s.label}
          </li>
        ))}
      </ol>

      {error ? (
        <Alert tone="danger" title="تعذّر إظهار النتيجة">
          {error}
        </Alert>
      ) : null}

      {step === 1 ? (
        <section className="card card-pad">
          <h2 className="text-base font-bold text-slate-900">في أي صف أنت؟</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            طالب الحادي عشر والثاني عشر يدخل درجاته أيضاً، فيُحتسب معدّله التنافسي.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {GRADES.map((g) => (
              <li key={g.value}>
                <button
                  type="button"
                  onClick={() => {
                    setGrade(g.value);
                    setStep(2);
                  }}
                  className={`inline-flex min-h-12 items-center rounded-[var(--radius-md)] border px-4 text-sm font-bold transition-colors ${
                    grade === g.value
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-[var(--color-line)] bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"
                  }`}
                >
                  {g.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="card card-pad">
          <h2 className="text-base font-bold text-slate-900">
            {needsMarks ? "اختر موادك وأدخل درجاتك" : "اختر المواد التي تدرسها"}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {needsMarks
              ? "أدخل درجتك في كل مادة من 100. كلما اكتملت موادك دقّت النتيجة."
              : "اختر ما تدرسه أو تنوي دراسته، لتظهر لك المجالات التي تفتحها."}
          </p>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {SUBJECTS.map((subject) => {
              const picked = chosen.includes(subject);
              return (
                <li
                  key={subject}
                  className={`flex items-center gap-3 rounded-[var(--radius-md)] border p-2 ${
                    picked ? "border-brand-300 bg-brand-50/60" : "border-[var(--color-line)]"
                  }`}
                >
                  <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={picked}
                      onChange={() => toggle(subject)}
                      className="h-5 w-5 accent-[var(--color-brand-700)]"
                    />
                    {subject}
                  </label>
                  {needsMarks && picked ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        value={marks[subject] ?? ""}
                        onChange={(e) =>
                          setMarks((m) => ({ ...m, [subject]: e.target.value }))
                        }
                        aria-label={`درجتك في ${subject}`}
                        className="input h-11 w-20 text-center tabular-nums"
                      />
                      <span className="text-xs text-[var(--color-muted)]">٪</span>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn-outline">
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
              السابق
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!ready || loading}
              className="btn-primary"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              )}
              أظهر التخصصات المتاحة
            </button>
            {!ready ? (
              <span className="text-xs text-[var(--color-muted)]">
                {chosen.length === 0
                  ? "اختر مادة واحدة على الأقل"
                  : "أكمل درجات المواد المختارة"}
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 3 && result ? (
        <Results result={result} needsMarks={needsMarks} onRestart={restart} />
      ) : null}
    </div>
  );
}

function MatchCard({ match, showCompetitive }: { match: ProgramMatch; showCompetitive: boolean }) {
  const place = [match.institution, match.country].filter(Boolean).join(" — ");
  return (
    <li className="card card-pad relative flex flex-col transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-[var(--radius-sm)] bg-brand-700 px-2 py-0.5 font-mono text-sm font-bold text-white">
          {match.code}
        </span>
        {showCompetitive && match.competitive !== null ? (
          <span className="badge-success tabular-nums">
            معدّلك التنافسي {match.competitive}٪
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-base leading-relaxed font-bold text-slate-900">
        <Link href={`/programs/${match.code}`} className="after:absolute after:inset-0">
          {match.name}
        </Link>
      </h3>

      <p className="mt-2 text-sm text-[var(--color-muted)]">{match.field}</p>
      {place ? <p className="mt-1 text-sm text-[var(--color-muted)]">{place}</p> : null}

      {!match.eligible ? (
        <p className="mt-3 text-xs leading-relaxed text-warning-700">
          ينقصك:{" "}
          {[
            !match.overallMet && match.minOverall !== null
              ? `معدل عام ${match.minOverall}٪`
              : null,
            ...match.unmetRules.map((r) => `${r.min}٪ في ${r.anyOf.join(" أو ")}`),
          ]
            .filter(Boolean)
            .join("، ")}
        </p>
      ) : null}
    </li>
  );
}

function Results({
  result,
  needsMarks,
  onRestart,
}: {
  result: MatchResult;
  needsMarks: boolean;
  onRestart: () => void;
}) {
  return (
    <div className="space-y-6">
      {needsMarks && result.overall !== null ? (
        <div className="card card-pad text-center">
          <p className="text-sm text-[var(--color-muted)]">متوسّط درجاتك في المواد التي أدخلتها</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-brand-800">
            {result.overall}٪
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
            المعدل التنافسي يختلف من برنامج لآخر لأنه يجمع متوسّط كل موادك (0.4) مع متوسّط
            مواد البرنامج نفسه (0.6)، كما في صفحة 11 من الدليل.
          </p>
        </div>
      ) : null}

      {result.fields.length > 0 ? (
        <section className="card card-pad">
          <h2 className="text-base font-bold text-slate-900">المجالات المتاحة لك</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {result.fields.map((f) => (
              <li
                key={f.field}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line)] px-3 py-2 text-sm font-bold text-slate-700"
              >
                <Check className="h-4 w-4 text-brand-700" aria-hidden="true" />
                {f.field}
                <span className="rounded-full bg-slate-100 px-1.5 text-xs tabular-nums text-slate-500">
                  {f.count}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-center text-xl font-bold text-slate-900">
          {result.eligible.length === 0
            ? "لا يوجد برنامج تنطبق عليه شروطك"
            : `${result.eligible.length} برنامجاً تنطبق عليك شروطه`}
        </h2>
        {needsMarks && result.eligible.length > 0 ? (
          <p className="mt-2 text-center text-sm text-[var(--color-muted)]">
            مرتّبة بمعدّلك التنافسي في كل برنامج، من الأعلى إلى الأقل.
          </p>
        ) : null}

        {result.eligible.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<TriangleAlert className="h-6 w-6" />}
              title="لم نجد برنامجاً مطابقاً"
              description="راجع موادك ودرجاتك، أو تصفّح الدليل كاملاً، وناقش خياراتك مع مختص التوجيه المهني."
              action={
                <Link href="/guide" className="btn-primary">
                  تصفّح الدليل
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.eligible.slice(0, 60).map((m) => (
              <MatchCard key={m.id} match={m} showCompetitive={needsMarks} />
            ))}
          </ul>
        )}
      </section>

      {result.nearMisses.length > 0 ? (
        <section>
          <h2 className="text-center text-lg font-bold text-slate-900">قريب منك</h2>
          <p className="mt-2 text-center text-sm text-[var(--color-muted)]">
            تدرس مواد هذه البرامج، لكن درجة أو أكثر دون الحدّ المطلوب.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.nearMisses.map((m) => (
              <MatchCard key={m.id} match={m} showCompetitive={needsMarks} />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="card card-pad bg-slate-50">
        <p className="text-sm leading-relaxed text-[var(--color-muted)]">
          هذه قراءة آلية لشروط الدليل تساعدك على تضييق خياراتك، وليست قراراً بالقبول. القبول
          يحدّده مركز القبول الموحد بحسب المقاعد وترتيب المتقدّمين.
          {result.unchecked > 0
            ? ` و${result.unchecked} برنامجاً لم تُقرأ شروطه آلياً، فراجعها في الدليل بنفسك.`
            : null}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={onRestart} className="btn-outline">
            ابدأ من جديد
          </button>
          <Link href="/booking" className="btn-primary">
            ناقش خياراتك مع مختص
          </Link>
        </div>
      </div>
    </div>
  );
}
