"use client";

// حجز موعد على خطوات. الطالب لا يكتب تاريخاً ولا وقتاً — يختار من المتاح فقط.
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  Clock,
  Link2 as LinkIcon,
  UserRound,
} from "lucide-react";
import { api, ApiClientError, messageOf } from "@/lib/client";
import { GRADES, GRADE_LABELS } from "@/lib/constants";
import { StepBack } from "@/components/ui/StepBack";
import { formatArabicDate, formatArabicTime, WEEKDAY_LABELS } from "@/lib/time";
import { Alert, EmptyState, Skeleton } from "@/components/ui/primitives";
import {
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/ui/form";

export interface SpecialistOption {
  id: string;
  name: string;
  title: string;
  bio: string;
}

export interface TopicOption {
  id: string;
  name: string;
  requiresDetails: boolean;
}

interface Slot {
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  date: string;
  weekday: number;
  slots: Slot[];
}

interface Confirmation {
  date: string;
  startTime: string;
  endTime: string;
  specialistName: string;
  topicName: string;
}

const STEPS = ["بياناتك", "الأخصائي", "الموعد", "الموضوع", "المراجعة"] as const;

export function BookingWizard({
  specialists,
  topics,
}: {
  specialists: SpecialistOption[];
  topics: TopicOption[];
}) {
  const [step, setStep] = useState(0);

  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [phone, setPhone] = useState("");
  const [specialistId, setSpecialistId] = useState(specialists[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topicDetails, setTopicDetails] = useState("");

  const [days, setDays] = useState<DayAvailability[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [trackingToken, setTrackingToken] = useState("");

  const selectedTopic = topics.find((t) => t.id === topicId);
  const selectedSpecialist = specialists.find((s) => s.id === specialistId);
  const selectedDay = days?.find((d) => d.date === date);

  const loadAvailability = useCallback(async (id: string) => {
    setLoadingSlots(true);
    setSlotsError(null);
    setDays(null);
    try {
      const res = await api.get<{ days: DayAvailability[] }>(
        `/api/specialists/${id}/availability`
      );
      setDays(res.days);
    } catch (e) {
      setSlotsError(messageOf(e));
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return (
          studentName.trim().length >= 3 && !!grade && /^[79]\d{7}$/u.test(phone.trim())
        );
      case 1:
        return !!specialistId;
      case 2:
        return !!date && !!startTime;
      case 3:
        return !!topicId && (!selectedTopic?.requiresDetails || topicDetails.trim().length >= 5);
      default:
        return true;
    }
  }, [
    step,
    studentName,
    grade,
    phone,
    specialistId,
    date,
    startTime,
    topicId,
    selectedTopic,
    topicDetails,
  ]);

  function next() {
    const nextErrors: Record<string, string | undefined> = {};
    if (step === 0) {
      if (studentName.trim().length < 3) nextErrors.studentName = "اكتب اسمك كاملاً (3 أحرف على الأقل)";
      if (!grade) nextErrors.grade = "اختر الصف الدراسي";
      if (!/^[79]\d{7}$/u.test(phone.trim())) {
        nextErrors.phone = "أدخل رقماً عُمانياً صحيحاً مكوّناً من 8 أرقام";
      }
    }
    if (step === 3 && selectedTopic?.requiresDetails && topicDetails.trim().length < 5) {
      nextErrors.topicDetails = "اكتب تفاصيل الاستشارة";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const target = Math.min(STEPS.length - 1, step + 1);
    setStep(target);
    // الأوقات تُجلب عند الوصول لخطوة الموعد فقط، لا عند فتح الصفحة.
    if (target === 2 && specialistId) void loadAvailability(specialistId);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ appointment: Confirmation; trackingToken: string }>("/api/appointments", {
        specialistId,
        studentName: studentName.trim(),
        grade,
        phone: phone.trim(),
        date,
        startTime,
        topicId,
        topicDetails: selectedTopic?.requiresDetails ? topicDetails.trim() : "",
      });
      setTrackingToken(res.trackingToken);
      setConfirmation(res.appointment);
    } catch (err) {
      setFormError(messageOf(err));
      // الفترة قد تكون حُجزت أثناء ملء النموذج — أعد الطالب لاختيار موعد آخر.
      if (err instanceof ApiClientError && err.status === 409) {
        setStartTime("");
        setStep(2);
        void loadAvailability(specialistId);
      }
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <div className="card card-pad">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-700">
            <Check className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">تم تأكيد طلب حجزك</h2>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              وصل إشعار بحجزك إلى الأخصائي. سيتواصل معك عند الحاجة على الرقم الذي أدخلته.
            </p>
          </div>
        </div>

        <dl className="mt-6 space-y-3 rounded-[var(--radius-md)] bg-slate-50 p-4 text-sm">
          {[
            { label: "الأخصائي", value: confirmation.specialistName },
            { label: "التاريخ", value: formatArabicDate(confirmation.date) },
            {
              label: "الوقت",
              value: `${formatArabicTime(confirmation.startTime)} — ${formatArabicTime(confirmation.endTime)}`,
            },
            { label: "الموضوع", value: confirmation.topicName },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-[5.5rem_1fr] gap-4">
              <dt className="text-[var(--color-muted)]">{row.label}</dt>
              <dd className="font-bold text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>

        {trackingToken ? (
          <div className="mt-5 rounded-[var(--radius-md)] border border-brand-100 bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-900">تابع حالة موعدك</p>
            <p className="mt-1 text-xs leading-relaxed text-brand-800">
              احفظ هذا الرابط لمعرفة إن أكّد الأخصائي موعدك.
            </p>
            <Link
              href={`/booking/${encodeURIComponent(trackingToken)}`}
              className="btn-secondary btn-sm mt-3"
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              فتح صفحة المتابعة
            </Link>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/assessment" className="btn-primary">
            جرّب مقياس السمات والميول
          </Link>
          <Link href="/" className="btn-outline">
            الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  if (specialists.length === 0) {
    return (
      <EmptyState
        icon={<UserRound className="h-6 w-6" />}
        title="لا يوجد أخصائيون متاحون للحجز حالياً"
        description="يمكنك المحاولة لاحقاً، أو الاستفادة من المكتبة الرقمية ودليل الطالب في هذه الأثناء."
        action={
          <Link href="/library" className="btn-outline">
            استكشف المكتبة
          </Link>
        }
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <StepBack
        label={STEPS[step - 1] ?? ""}
        onBack={step > 0 && !submitting ? () => setStep((v) => Math.max(0, v - 1)) : undefined}
        exit={{ href: "/", label: "الرئيسية" }}
      />

      {/* مؤشّر الخطوات */}
      <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                i < step
                  ? "bg-brand-700 text-white"
                  : i === step
                    ? "bg-brand-100 text-brand-800 ring-2 ring-brand-600"
                    : "bg-slate-100 text-slate-400"
              }`}
              aria-hidden="true"
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={i === step ? "font-bold text-slate-900" : "text-[var(--color-faint)]"}
              aria-current={i === step ? "step" : undefined}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? (
              <span className="mx-1 text-[var(--color-faint)]" aria-hidden="true">
                ·
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="card card-pad">
        {/* الخطوة 1 — البيانات */}
        {step === 0 ? (
          <>
            <h2 className="text-lg font-bold text-slate-900">بياناتك</h2>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              نحتاجها لتأكيد الموعد والتواصل معك بشأنه.
            </p>
            <div className="mt-6 space-y-5">
              <TextField
                label="الاسم"
                required
                autoComplete="name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                error={errors.studentName}
                placeholder="الاسم الثلاثي"
              />
              <SelectField
                label="الصف الدراسي"
                required
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                error={errors.grade}
                placeholder="اختر الصف"
                options={GRADES.map((g) => ({ value: g.value, label: g.label }))}
              />
              <TextField
                label="رقم الهاتف"
                required
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                dir="ltr"
                maxLength={8}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/gu, ""))}
                error={errors.phone}
                hint="8 أرقام تبدأ بـ 9 أو 7"
                placeholder="9xxxxxxx"
              />
            </div>
          </>
        ) : null}

        {/* الخطوة 2 — الأخصائي */}
        {step === 1 ? (
          <>
            <h2 className="text-lg font-bold text-slate-900">اختر الأخصائي</h2>
            <fieldset className="mt-5">
              <legend className="sr-only">قائمة الأخصائيين المتاحين</legend>
              <div className="grid gap-3">
                {specialists.map((s) => {
                  const active = specialistId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSpecialistId(s.id);
                        setDate("");
                        setStartTime("");
                      }}
                      aria-pressed={active}
                      className={`cursor-pointer rounded-[var(--radius-md)] border-2 p-4 text-start transition-colors ${
                        active
                          ? "border-brand-700 bg-brand-50"
                          : "border-[var(--color-line-strong)] bg-white hover:border-brand-400"
                      }`}
                    >
                      <span className="block font-bold text-slate-900">{s.name}</span>
                      <span className="mt-0.5 block text-sm text-[var(--color-muted)]">
                        {s.title}
                      </span>
                      {s.bio ? (
                        <span className="mt-2 block text-xs leading-relaxed text-[var(--color-muted)]">
                          {s.bio}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </>
        ) : null}

        {/* الخطوة 3 — اليوم والوقت */}
        {step === 2 ? (
          <>
            <h2 className="text-lg font-bold text-slate-900">اختر اليوم والوقت</h2>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              تظهر الأوقات المتاحة فعلاً لدى {selectedSpecialist?.name}.
            </p>

            {loadingSlots ? (
              <div className="mt-6 space-y-3" role="status" aria-label="جارِ تحميل الأوقات">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : slotsError ? (
              <div className="mt-6">
                <Alert tone="danger" title="تعذّر تحميل الأوقات">
                  {slotsError}
                  <button
                    type="button"
                    className="mt-3 block font-bold underline"
                    onClick={() => void loadAvailability(specialistId)}
                  >
                    إعادة المحاولة
                  </button>
                </Alert>
              </div>
            ) : days && days.length === 0 ? (
              <div className="mt-6">
                <Alert tone="warning" title="لا توجد أوقات متاحة حالياً">
                  لم يُتِح الأخصائي فترات في الأيام القادمة. حاول لاحقاً أو اختر أخصائياً آخر.
                </Alert>
              </div>
            ) : days ? (
              <>
                <fieldset className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <legend className="label">اليوم</legend>
                    {date ? (
                      <ChangeButton
                        label="تغيير اليوم"
                        onClick={() => {
                          setDate("");
                          setStartTime("");
                        }}
                      />
                    ) : null}
                  </div>
                  {/* بعد الاختيار يبقى اليوم المختار وحده، فتقصر الصفحة ويتّضح ما اختير */}
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {days.filter((d) => !date || d.date === date).map((d) => {
                      const active = date === d.date;
                      const [, month, day] = d.date.split("-");
                      return (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => {
                            setDate(d.date);
                            setStartTime("");
                          }}
                          aria-pressed={active}
                          className={`cursor-pointer rounded-[var(--radius-md)] border-2 px-3 py-2.5 text-center transition-colors ${
                            active
                              ? "border-brand-700 bg-brand-50 text-brand-900"
                              : "border-[var(--color-line-strong)] bg-white text-slate-700 hover:border-brand-400"
                          }`}
                        >
                          <span className="block text-xs">{WEEKDAY_LABELS[d.weekday]}</span>
                          <span className="mt-0.5 block text-sm font-bold tabular-nums">
                            {day}/{month}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-[var(--color-faint)]">
                            {d.slots.length} فترة
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {selectedDay ? (
                  <fieldset className="mt-5">
                    <div className="flex items-center justify-between gap-3">
                      <legend className="label">الوقت</legend>
                      {startTime ? (
                        <ChangeButton label="تغيير الوقت" onClick={() => setStartTime("")} />
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {selectedDay.slots
                        .filter((slot) => !startTime || slot.startTime === startTime)
                        .map((slot) => {
                        const active = startTime === slot.startTime;
                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            onClick={() => setStartTime(slot.startTime)}
                            aria-pressed={active}
                            className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-2 px-3 text-sm font-bold transition-colors ${
                              active
                                ? "border-brand-700 bg-brand-50 text-brand-900"
                                : "border-[var(--color-line-strong)] bg-white text-slate-700 hover:border-brand-400"
                            }`}
                          >
                            <Clock className="h-4 w-4" aria-hidden="true" />
                            {formatArabicTime(slot.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : (
                  <p className="mt-5 text-sm text-[var(--color-muted)]">
                    اختر يوماً لعرض الأوقات المتاحة فيه.
                  </p>
                )}
              </>
            ) : null}
          </>
        ) : null}

        {/* الخطوة 4 — الموضوع */}
        {step === 3 ? (
          <>
            <h2 className="text-lg font-bold text-slate-900">موضوع الاستشارة</h2>
            <fieldset className="mt-5">
              <legend className="sr-only">اختر موضوع الاستشارة</legend>
              <div className="grid gap-2">
                {topics.map((t) => {
                  const active = topicId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTopicId(t.id)}
                      aria-pressed={active}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border-2 px-4 py-2.5 text-start text-sm font-bold transition-colors ${
                        active
                          ? "border-brand-700 bg-brand-50 text-brand-900"
                          : "border-[var(--color-line-strong)] bg-white text-slate-700 hover:border-brand-400"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          active ? "border-brand-700 bg-brand-700 text-white" : "border-[var(--color-line-strong)]"
                        }`}
                        aria-hidden="true"
                      >
                        {active ? <Check className="h-3 w-3" /> : null}
                      </span>
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* حقل التفاصيل يظهر فقط للموضوع الذي يتطلّبه */}
            {selectedTopic?.requiresDetails ? (
              <div className="mt-5">
                <TextAreaField
                  label="تفاصيل الاستشارة"
                  required
                  value={topicDetails}
                  onChange={(e) => setTopicDetails(e.target.value)}
                  error={errors.topicDetails}
                  hint="اكتب باختصار ما تودّ مناقشته."
                  maxLength={1000}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {/* الخطوة 5 — المراجعة */}
        {step === 4 ? (
          <>
            <h2 className="text-lg font-bold text-slate-900">مراجعة الحجز</h2>
            <dl className="mt-5 space-y-3 rounded-[var(--radius-md)] bg-slate-50 p-4 text-sm">
              {[
                { label: "الاسم", value: studentName },
                { label: "الصف", value: GRADE_LABELS[grade] ?? grade },
                { label: "الهاتف", value: phone },
                { label: "الأخصائي", value: selectedSpecialist?.name ?? "" },
                { label: "التاريخ", value: formatArabicDate(date) },
                { label: "الوقت", value: formatArabicTime(startTime) },
                { label: "الموضوع", value: selectedTopic?.name ?? "" },
                ...(selectedTopic?.requiresDetails
                  ? [{ label: "التفاصيل", value: topicDetails }]
                  : []),
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-[5.5rem_1fr] gap-4">
                  <dt className="text-[var(--color-muted)]">{row.label}</dt>
                  <dd className="font-bold text-slate-900">{row.value}</dd>
                </div>
              ))}
            </dl>

            {formError ? (
              <div className="mt-5">
                <Alert tone="danger">{formError}</Alert>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* التنقّل بين الخطوات */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          className="btn-outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
          السابق
        </button>

        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={next}
            // خطوتا البيانات والموضوع تبقيان مفعّلتين: الضغط يُظهر ما ينقص تحت حقله
            // بدل زرّ معطّل صامت لا يقول لماذا
            disabled={step !== 0 && step !== 3 && !stepValid}
          >
            التالي
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <SubmitButton loading={submitting} className="btn-primary flex-1 sm:flex-none">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
            تأكيد الحجز
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

/** يعيد عرض الخيارات كلها بعد أن طُويت على الخيار المختار. */
function ChangeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 cursor-pointer rounded-[var(--radius-sm)] px-2 py-1 text-sm font-bold text-brand-700 hover:bg-brand-50 hover:text-brand-800"
    >
      {label}
    </button>
  );
}
