"use client";

// واجهة الإجابة: سؤال واحد في بؤرة الشاشة، حفظ تلقائي بعد كل اختيار.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronsLeft,
  CloudOff,
  Loader2,
} from "lucide-react";
import { api, messageOf } from "@/lib/client";
import { Alert, ErrorState, ProgressBar, SkeletonList } from "@/components/ui/primitives";

interface Question {
  id: string;
  number: number;
  text: string;
  groupNumber: number;
  groupTitle: string;
}

interface Option {
  value: number;
  label: string;
}

interface SessionPayload {
  session: { status: string; studentName: string; grade: string };
  assessment: {
    title: string;
    groupCount: number;
    questionsPerGroup: number;
    totalQuestions: number;
    options: Option[];
    groups: { number: number; title: string; questions: { id: string; number: number; text: string }[] }[];
  };
  answers: Record<string, number>;
}

/** أقصى عدد إجابات في الطلب الواحد — حدُّ الخادم ستون. */
const SAVE_BATCH = 50;

type SaveState = "idle" | "saving" | "saved" | "failed";
type Phase = "loading" | "error" | "answering" | "review" | "submitting";

export function AssessmentRunner() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<SessionPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** طلب التخطّي معروضٌ للتأكيد — التخطّي يمسح ما أُجيب فلا يقع بنقرة واحدة. */
  const [askSkip, setAskSkip] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  /** الإجابات التي لم تصل الخادم بعد — تُعاد محاولتها قبل الإرسال. */
  const pendingRef = useRef<Map<string, number>>(new Map());

  // الحالة الابتدائية "loading"، والتحديث يقع بعد انتهاء الطلب فقط.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const payload = await api.get<SessionPayload>("/api/assessment/sessions/current");
        if (cancelled) return;
        if (payload.session.status === "SUBMITTED") {
          setLoadError("تم إرسال هذا الاختبار مسبقاً.");
          setPhase("error");
          return;
        }
        setData(payload);
        setAnswers(payload.answers);
        // استئناف من أول سؤال بلا إجابة
        const flat = payload.assessment.groups.flatMap((g) => g.questions);
        const firstUnanswered = flat.findIndex((q) => payload.answers[q.id] === undefined);
        setIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
        setPhase("answering");
      } catch (e) {
        if (cancelled) return;
        setLoadError(messageOf(e));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const questions = useMemo<Question[]>(() => {
    if (!data) return [];
    return data.assessment.groups.flatMap((g) =>
      g.questions.map((q) => ({ ...q, groupNumber: g.number, groupTitle: g.title }))
    );
  }, [data]);

  const total = questions.length;
  const current = questions[index];

  /**
   * خيار النفي: «لا أفضّل هذا النشاط» — أدنى قيمة في خيارات المقياس.
   * يُقرأ من الخيارات نفسها لا يُكتب هنا، فلو تغيّرت صياغتها بقي الزرّ صحيحاً.
   */
  const declineOption = useMemo<Option | null>(() => {
    const options = data?.assessment.options ?? [];
    if (options.length === 0) return null;
    return options.reduce((low, o) => (o.value < low.value ? o : low));
  }, [data]);
  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined).length,
    [questions, answers]
  );

  // نقل التركيز إلى نصّ السؤال الجديد حتى يتابع مستخدم القارئ الشاشي مكانه.
  useEffect(() => {
    if (phase === "answering") headingRef.current?.focus();
  }, [index, phase]);

  const persist = useCallback(async (questionId: string, value: number) => {
    pendingRef.current.set(questionId, value);
    setSaveState("saving");
    try {
      await api.post("/api/assessment/sessions/current/answers", {
        answers: [{ questionId, value }],
      });
      pendingRef.current.delete(questionId);
      setSaveState(pendingRef.current.size === 0 ? "saved" : "saving");
    } catch {
      setSaveState("failed");
    }
  }, []);

  /** إعادة إرسال ما لم يُحفظ. تُستدعى قبل الإرسال النهائي. */
  const flushPending = useCallback(async (): Promise<boolean> => {
    if (pendingRef.current.size === 0) return true;
    const batch = [...pendingRef.current.entries()].map(([questionId, value]) => ({
      questionId,
      value,
    }));
    try {
      await api.post("/api/assessment/sessions/current/answers", { answers: batch });
      pendingRef.current.clear();
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("failed");
      return false;
    }
  }, []);

  function choose(value: number) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
    void persist(current.id, value);
    // انتقال تلقائي للسؤال التالي بعد اختيار — يقلّل النقرات على الجوال
    if (index < total - 1) {
      window.setTimeout(() => setIndex((i) => Math.min(i + 1, total - 1)), 180);
    }
  }

  async function goToReview() {
    await flushPending();
    setPhase("review");
  }

  /**
   * تخطّي الأسئلة: تُملأ كل العبارات بخيار النفي ثم يُنتقل إلى المراجعة.
   * تُرسل على دفعات لأن الخادم يحدّ عدد الإجابات في الطلب الواحد.
   */
  async function skipAll() {
    if (!declineOption || skipping) return;
    const value = declineOption.value;

    setSkipping(true);
    setSubmitError(null);
    const filled: Record<string, number> = {};
    for (const q of questions) {
      filled[q.id] = value;
      pendingRef.current.set(q.id, value);
    }
    setAnswers(filled);
    setSaveState("saving");

    try {
      const entries = questions.map((q) => ({ questionId: q.id, value }));
      for (let i = 0; i < entries.length; i += SAVE_BATCH) {
        const batch = entries.slice(i, i + SAVE_BATCH);
        await api.post("/api/assessment/sessions/current/answers", { answers: batch });
        for (const e of batch) pendingRef.current.delete(e.questionId);
      }
      setSaveState("saved");
      setAskSkip(false);
      setPhase("review");
    } catch {
      // الإجابات باقية في pendingRef، فتُعاد محاولتها قبل الإرسال
      setSaveState("failed");
    } finally {
      setSkipping(false);
    }
  }

  async function submit() {
    if (phase === "submitting") return;
    setSubmitError(null);

    const flushed = await flushPending();
    if (!flushed) {
      setSubmitError("تعذّر حفظ بعض الإجابات. تحقّق من اتصالك ثم أعد المحاولة.");
      return;
    }

    setPhase("submitting");
    try {
      const { resultToken } = await api.post<{ resultToken: string }>(
        "/api/assessment/sessions/current/submit",
        { confirm: true }
      );
      router.replace(`/assessment/results/${encodeURIComponent(resultToken)}`);
    } catch (e) {
      setSubmitError(messageOf(e));
      setPhase("review");
    }
  }

  if (phase === "loading") {
    return (
      <div className="container-narrow py-12">
        <SkeletonList rows={3} />
      </div>
    );
  }

  if (phase === "error" || !data || !current) {
    return (
      <div className="container-narrow py-12">
        <ErrorState
          title="تعذّر فتح الاختبار"
          description={loadError ?? "ابدأ الاختبار من جديد."}
        />
        <div className="mt-4 text-center">
          <button type="button" className="btn-primary" onClick={() => router.push("/assessment")}>
            العودة إلى صفحة الاختبار
          </button>
        </div>
      </div>
    );
  }

  // ── شاشة المراجعة والتأكيد ──
  if (phase === "review" || phase === "submitting") {
    const missing = questions.filter((q) => answers[q.id] === undefined);
    return (
      <div className="container-narrow py-10">
        <h1 className="section-title text-center">مراجعة قبل الإرسال</h1>
        <p className="section-lead mx-auto text-center">
          أجبت على {answeredCount} من {total} عبارة.
        </p>

        <div className="mt-6 space-y-4">
          {missing.length > 0 ? (
            <Alert tone="warning" title={`بقيت ${missing.length} عبارة بلا إجابة`}>
              أكمل الإجابات المتبقية قبل الإرسال.
              <button
                type="button"
                className="mt-3 block font-bold text-warning-700 underline"
                onClick={() => {
                  const firstMissing = questions.findIndex((q) => answers[q.id] === undefined);
                  setIndex(firstMissing);
                  setPhase("answering");
                }}
              >
                انتقل إلى أول عبارة ناقصة
              </button>
            </Alert>
          ) : (
            <Alert tone="success" title="كل العبارات مكتملة">
              بعد الإرسال ستظهر نتيجتك مباشرة، ولن يمكن تعديل الإجابات.
            </Alert>
          )}

          {submitError ? <Alert tone="danger">{submitError}</Alert> : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary btn-lg"
            onClick={submit}
            disabled={missing.length > 0 || phase === "submitting"}
            aria-busy={phase === "submitting" || undefined}
          >
            {phase === "submitting" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                جارِ احتساب النتيجة…
              </>
            ) : (
              <>
                <Check className="h-5 w-5" aria-hidden="true" />
                إرسال الإجابات
              </>
            )}
          </button>
          <button
            type="button"
            className="btn-outline btn-lg"
            onClick={() => setPhase("answering")}
            disabled={phase === "submitting"}
          >
            العودة للإجابات
          </button>
        </div>
      </div>
    );
  }

  // ── شاشة الإجابة ──
  const isLast = index === total - 1;
  const selected = answers[current.id];

  return (
    <div className="container-narrow pb-32 pt-8 sm:pb-12">
      {/* التقدّم */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-bold text-slate-900">
          السؤال {current.number} من {total}
        </p>
        <p className="text-[var(--color-muted)]">
          المجموعة {current.groupNumber} من {data.assessment.groupCount}
        </p>
      </div>
      <div className="mt-2">
        <ProgressBar value={answeredCount} max={total} label="تقدّمك في الاختبار" />
      </div>
      <p className="mt-1.5 text-xs text-[var(--color-muted)]">
        أجبت على {answeredCount} من {total}
      </p>

      {/* السؤال */}
      <div className="card mt-6 p-6 sm:p-8">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-xl leading-relaxed font-bold text-slate-900 outline-none sm:text-2xl"
        >
          {current.text}
        </h1>

        <fieldset className="mt-6">
          <legend className="sr-only">اختر ما ينطبق عليك</legend>
          <div className="grid gap-3">
            {data.assessment.options.map((opt) => {
              const active = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => choose(opt.value)}
                  aria-pressed={active}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border-2 px-4 py-3 text-start text-base font-bold transition-colors duration-150 ${
                    active
                      ? "border-brand-700 bg-brand-50 text-brand-900"
                      : "border-[var(--color-line-strong)] bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50/40"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      active ? "border-brand-700 bg-brand-700 text-white" : "border-[var(--color-line-strong)]"
                    }`}
                    aria-hidden="true"
                  >
                    {active ? <Check className="h-4 w-4" /> : null}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* حالة الحفظ */}
        <p className="mt-5 flex min-h-5 items-center gap-1.5 text-xs" aria-live="polite">
          {saveState === "saving" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-faint)]" aria-hidden="true" />
              <span className="text-[var(--color-faint)]">جارِ الحفظ…</span>
            </>
          ) : saveState === "saved" ? (
            <>
              <Check className="h-3.5 w-3.5 text-success-600" aria-hidden="true" />
              <span className="text-[var(--color-muted)]">حُفظت إجابتك</span>
            </>
          ) : saveState === "failed" ? (
            <>
              <CloudOff className="h-3.5 w-3.5 text-danger-600" aria-hidden="true" />
              <span className="font-semibold text-danger-700">
                تعذّر الحفظ — إجابتك محفوظة في المتصفح وستُرسل عند عودة الاتصال
              </span>
            </>
          ) : null}
        </p>
      </div>

      {/* تخطّي الأسئلة — تُملأ كلها بخيار النفي */}
      {declineOption ? (
        <div className="mt-4">
          {askSkip ? (
            <Alert tone="warning" title="تخطّي كل الأسئلة؟">
              <p className="leading-relaxed">
                ستُضبَط الـ{total} عبارة كلها على «{declineOption.label}»، ويُستبدل ما أجبت عنه.
                يمكنك تعديل أي عبارة قبل الإرسال، لكن نتيجةً كهذه لا تعبّر عن ميولك.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => void skipAll()}
                  disabled={skipping}
                  aria-busy={skipping || undefined}
                >
                  {skipping ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      جارِ التخطّي…
                    </>
                  ) : (
                    <>
                      <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                      نعم، تخطَّ كل الأسئلة
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-outline btn-sm"
                  onClick={() => setAskSkip(false)}
                  disabled={skipping}
                >
                  تراجع
                </button>
              </div>
            </Alert>
          ) : (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setAskSkip(true)}
            >
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
              تخطّي الأسئلة — تُملأ كلها بـ«{declineOption.label}»
            </button>
          )}
        </div>
      ) : null}

      {/* التنقّل — ملتصق بأسفل الشاشة على الجوال ليسهل الوصول بيد واحدة */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-line)] bg-white/95 p-3 backdrop-blur-sm sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="container-narrow flex items-center gap-3 sm:px-0">
          <button
            type="button"
            className="btn-outline flex-1 sm:flex-none"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
            السابق
          </button>

          {isLast ? (
            <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={goToReview}>
              مراجعة وإرسال
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary flex-1 sm:flex-none"
              onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            >
              التالي
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          {answeredCount === total && !isLast ? (
            <button type="button" className="btn-ghost btn-sm hidden sm:inline-flex" onClick={goToReview}>
              الانتقال للمراجعة
            </button>
          ) : null}
        </div>
      </div>

      {selected === undefined ? (
        <p className="mt-4 hidden items-center gap-1.5 text-xs text-[var(--color-muted)] sm:flex">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          اختر إجابة للمتابعة. يمكنك العودة لأي سؤال قبل الإرسال.
        </p>
      ) : null}
    </div>
  );
}
