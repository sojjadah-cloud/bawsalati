"use client";

// «اعرف تخصصك»
// الصفّ أولاً، ثم المواد، ثم النتيجة. طالب الحادي عشر والثاني عشر يدخل
// درجاته أيضاً فيُحتسب معدّله التنافسي لكل برنامج كما ينصّ الدليل.
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, TriangleAlert } from "lucide-react";
import { api, messageOf } from "@/lib/client";
import { GRADES, SUBJECTS, SUBJECT_GROUPS, SUBJECT_PLAN } from "@/lib/constants";
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
  missingSubjects: Subject[];
  eligible: boolean;
}

interface MatchResult {
  eligible: ProgramMatch[];
  nearMisses: ProgramMatch[];
  needsSubjects: ProgramMatch[];
  fields: { field: string; count: number }[];
  overall: number | null;
  unchecked: number;
}

/** الصفّان الحادي عشر والثاني عشر يدخلان الدرجات، وما دونهما المواد فقط. */
const GRADES_WITH_MARKS = ["11", "12"];

const CORE = SUBJECT_GROUPS.core as readonly Subject[];
const MATHS = SUBJECT_GROUPS.math as readonly Subject[];
const SCIENCES = SUBJECT_GROUPS.science as readonly Subject[];
const ELECTIVES = [...SUBJECT_GROUPS.science, ...SUBJECT_GROUPS.elective] as readonly Subject[];

export function EligibilityWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [grade, setGrade] = useState("");
  const [math, setMath] = useState<Subject | "">("");
  const [electives, setElectives] = useState<Subject[]>([]);
  const [marks, setMarks] = useState<Partial<Record<Subject, string>>>({});
  /** يُرفع عند محاولة المتابعة بدرجات ناقصة، فتُوسم الخانات الفارغة بوضوح */
  const [showMarkErrors, setShowMarkErrors] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsMarks = GRADES_WITH_MARKS.includes(grade);

  // الخطة الرسمية: الإلزامية للجميع، ومادة رياضيات، وثلاث اختيارية
  const chosen: Subject[] = [...CORE, ...(math ? [math] : []), ...electives];

  function pickMath(subject: Subject) {
    setMath((current) => {
      if (current && current !== subject) clearMark(current);
      return current === subject ? "" : subject;
    });
    if (math === subject) clearMark(subject);
  }

  function toggleElective(subject: Subject) {
    setElectives((list) => {
      if (list.includes(subject)) {
        clearMark(subject);
        return list.filter((s) => s !== subject);
      }
      if (list.length >= SUBJECT_PLAN.electiveCount) return list;
      return [...list, subject];
    });
  }

  function clearMark(subject: Subject) {
    setMarks((m) => {
      const next = { ...m };
      delete next[subject];
      return next;
    });
  }

  const scienceCount = electives.filter((s) => SCIENCES.includes(s)).length;
  const planComplete =
    math !== "" &&
    electives.length === SUBJECT_PLAN.electiveCount &&
    scienceCount >= SUBJECT_PLAN.minScience;

  const markMissing = (s: Subject) => {
    const value = marks[s];
    if (value === undefined || value.trim() === "") return true;
    const n = Number(value);
    return !Number.isFinite(n) || n < 0 || n > 100;
  };
  const missingMarks = needsMarks ? chosen.filter(markMissing) : [];
  const marksComplete = missingMarks.length === 0;

  const ready = planComplete && (!needsMarks || marksComplete);

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
    setMath("");
    setElectives([]);
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
        <section className="space-y-4">
          <div className="card card-pad">
            <h2 className="text-base font-bold text-slate-900">موادك في الخطة الدراسية</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
              الخطة الرسمية: أربع مواد إلزامية للجميع، ومادة رياضيات واحدة، وثلاث مواد
              اختيارية على أن تكون واحدة منها على الأقل مادة علمية.
              {needsMarks ? " وأدخل درجتك في كل مادة من 100." : ""}
            </p>
          </div>

          <SubjectGroup
            title="المواد الإلزامية"
            hint="تُدرَس للجميع"
            subjects={CORE}
            isPicked={() => true}
            locked
            needsMarks={needsMarks}
            marks={marks}
            setMark={(s, v) => setMarks((m) => ({ ...m, [s]: v }))}
            missingMarks={showMarkErrors ? missingMarks : []}
          />

          <SubjectGroup
            title="الرياضيات"
            hint={math ? "اخترت مادة" : "اختر واحدة"}
            subjects={MATHS}
            isPicked={(s) => math === s}
            onToggle={pickMath}
            needsMarks={needsMarks}
            marks={marks}
            setMark={(s, v) => setMarks((m) => ({ ...m, [s]: v }))}
            missingMarks={showMarkErrors ? missingMarks : []}
          />

          <SubjectGroup
            title="المواد الاختيارية"
            hint={`اخترت ${electives.length} من ${SUBJECT_PLAN.electiveCount}`}
            subjects={ELECTIVES}
            isPicked={(s) => electives.includes(s)}
            onToggle={toggleElective}
            disabledWhen={(s) =>
              !electives.includes(s) && electives.length >= SUBJECT_PLAN.electiveCount
            }
            scienceSet={SCIENCES}
            needsMarks={needsMarks}
            marks={marks}
            setMark={(s, v) => setMarks((m) => ({ ...m, [s]: v }))}
            missingMarks={showMarkErrors ? missingMarks : []}
          />

          {electives.length > 0 && scienceCount < SUBJECT_PLAN.minScience ? (
            <Alert tone="warning" title="ينقصك مادة علمية">
              يجب أن تكون واحدة من الثلاث على الأقل مادة علمية: الفيزياء أو الكيمياء أو
              الأحياء أو العلوم البيئية.
            </Alert>
          ) : null}

          {showMarkErrors && missingMarks.length > 0 ? (
            <Alert tone="danger" title="أدخل درجاتك أولاً">
              اكتب درجتك من 100 في {missingMarks.length === 1 ? "المادة" : "المواد"}:{" "}
              {missingMarks.join("، ")}.
            </Alert>
          ) : null}

          <div className="card card-pad flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn-outline">
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
              السابق
            </button>
            <button
              type="button"
              onClick={() => {
                if (needsMarks && !marksComplete) {
                  setShowMarkErrors(true);
                  document
                    .querySelector<HTMLInputElement>("[data-mark-missing='true']")
                    ?.focus();
                  return;
                }
                void submit();
              }}
              disabled={!planComplete || loading}
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
                {!math
                  ? "اختر مادة الرياضيات"
                  : electives.length < SUBJECT_PLAN.electiveCount
                    ? `اختر ${SUBJECT_PLAN.electiveCount - electives.length} مادة اختيارية`
                    : scienceCount < SUBJECT_PLAN.minScience
                      ? "اختر مادة علمية واحدة على الأقل"
                      : "أكمل درجات موادك"}
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

/** مجموعة مواد من الخطة: إلزامية مقفلة، أو خيار واحد، أو اختيار محدود. */
function SubjectGroup({
  title,
  hint,
  subjects,
  isPicked,
  onToggle,
  disabledWhen,
  locked = false,
  scienceSet,
  needsMarks,
  marks,
  missingMarks = [],
  setMark,
}: {
  title: string;
  hint: string;
  subjects: readonly Subject[];
  isPicked: (subject: Subject) => boolean;
  onToggle?: (subject: Subject) => void;
  disabledWhen?: (subject: Subject) => boolean;
  locked?: boolean;
  scienceSet?: readonly Subject[];
  needsMarks: boolean;
  marks: Partial<Record<Subject, string>>;
  /** المواد التي لم تُكتب درجتها بعد محاولة المتابعة، تُوسم بالأحمر */
  missingMarks?: Subject[];
  setMark: (subject: Subject, value: string) => void;
}) {
  return (
    <section className="card card-pad">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <span className="text-xs text-[var(--color-muted)]">{hint}</span>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {subjects.map((subject) => {
          const picked = isPicked(subject);
          const disabled = !locked && (disabledWhen?.(subject) ?? false);
          const isScience = scienceSet?.includes(subject) ?? false;
          const missing = picked && missingMarks.includes(subject);

          return (
            <li
              key={subject}
              className={`flex items-center gap-3 rounded-[var(--radius-md)] border p-2 ${
                picked ? "border-brand-300 bg-brand-50/60" : "border-[var(--color-line)]"
              } ${disabled ? "opacity-50" : ""}`}
            >
              <label
                className={`flex min-h-11 flex-1 items-center gap-2 text-sm font-bold text-slate-700 ${
                  locked || disabled ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={picked}
                  disabled={locked || disabled}
                  onChange={() => onToggle?.(subject)}
                  className="h-5 w-5 accent-[var(--color-brand-700)]"
                />
                <span>{subject}</span>
                {isScience ? (
                  <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-500">
                    علمية
                  </span>
                ) : null}
              </label>

              {needsMarks && picked ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="text-xs font-bold text-[var(--color-muted)]">الدرجة</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    inputMode="numeric"
                    placeholder="—"
                    value={marks[subject] ?? ""}
                    onChange={(e) => setMark(subject, e.target.value)}
                    aria-label={`درجتك في ${subject} من 100`}
                    aria-invalid={missing ? true : undefined}
                    data-mark-missing={missing ? "true" : undefined}
                    className={`input h-12 w-24 text-center text-base font-bold tabular-nums ${
                      missing
                        ? "border-2 border-danger-600 bg-danger-50 text-danger-700"
                        : "border-2 border-brand-300 bg-white"
                    }`}
                  />
                  <span className="text-sm font-bold text-[var(--color-muted)]">٪</span>
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
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
            match.missingSubjects.length > 0
              ? `دراسة ${match.missingSubjects.join(" أو ")}`
              : null,
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
  /** مجال واحد مختار: تُعرض برامجه وحدها بدل تصفّح القائمة كلها. */
  const [field, setField] = useState<string>("");
  const eligible = field ? result.eligible.filter((m) => m.field === field) : result.eligible;

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
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            اضغط مجالاً لترى برامجه وحدها.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            <li>
              <button
                type="button"
                onClick={() => setField("")}
                aria-pressed={field === ""}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border px-3 text-sm font-bold transition-colors ${
                  field === ""
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-[var(--color-line)] bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"
                }`}
              >
                كل المجالات
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    field === "" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {result.eligible.length}
                </span>
              </button>
            </li>
            {result.fields.map((f) => {
              const active = field === f.field;
              return (
                <li key={f.field}>
                  <button
                    type="button"
                    onClick={() => setField(active ? "" : f.field)}
                    aria-pressed={active}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border px-3 text-sm font-bold transition-colors ${
                      active
                        ? "border-brand-700 bg-brand-700 text-white"
                        : "border-[var(--color-line)] bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    <Check
                      className={`h-4 w-4 ${active ? "text-white" : "text-brand-700"}`}
                      aria-hidden="true"
                    />
                    {f.field}
                    <span
                      className={`rounded-full px-1.5 text-xs tabular-nums ${
                        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-center text-xl font-bold text-slate-900">
          {result.eligible.length === 0
            ? "لا يوجد برنامج تنطبق عليه شروطك"
            : field
              ? `${eligible.length} برنامجاً في ${field}`
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
              description="راجع موادك ودرجاتك، أو تصفّح الدليل كاملاً، وناقش خياراتك مع أخصائي التوجيه المهني."
              action={
                <Link href="/guide" className="btn-primary">
                  تصفّح الدليل
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eligible.slice(0, 60).map((m) => (
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

      {result.needsSubjects.length > 0 ? (
        <section>
          <h2 className="text-center text-lg font-bold text-slate-900">تحتاج مواد أخرى</h2>
          <p className="mt-2 text-center text-sm text-[var(--color-muted)]">
            برامج تشترط مواد ليست ضمن خطتك. إن كنت في الحادي عشر فما زال بإمكانك تعديل
            اختيارك، وناقش ذلك مع أخصائي التوجيه المهني.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.needsSubjects.map((m) => (
              <MatchCard key={m.id} match={m} showCompetitive={false} />
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
            ناقش خياراتك مع أخصائي
          </Link>
        </div>
      </div>
    </div>
  );
}
