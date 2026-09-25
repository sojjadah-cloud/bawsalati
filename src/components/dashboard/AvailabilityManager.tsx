"use client";

// إدارة أوقات الأخصائي: نوافذ دوام أسبوعية + أيام غير متاحة.
import { useCallback, useEffect, useState } from "react";
import { CalendarOff, Clock, Plus, Trash2 } from "lucide-react";
import { api, messageOf } from "@/lib/client";
import { WEEKDAY_LABELS, formatArabicDate, formatArabicTime, todayIso } from "@/lib/time";
import { useToast } from "@/components/ui/Toast";
import { Alert, EmptyState, SkeletonList } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { CheckboxField, SelectField, SubmitButton, TextField } from "@/components/ui/form";

interface Window {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  active: boolean;
}

interface Blocked {
  id: string;
  date: string;
  fullDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string;
}

export function AvailabilityManager() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [windows, setWindows] = useState<Window[]>([]);
  const [blocked, setBlocked] = useState<Blocked[]>([]);

  const [weekday, setWeekday] = useState("0");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [slotMinutes, setSlotMinutes] = useState("30");
  const [windowError, setWindowError] = useState<string | null>(null);
  const [savingWindow, setSavingWindow] = useState(false);

  const [blockDate, setBlockDate] = useState("");
  const [fullDay, setFullDay] = useState(true);
  const [blockStart, setBlockStart] = useState("08:00");
  const [blockEnd, setBlockEnd] = useState("10:00");
  const [reason, setReason] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);
  const [savingBlock, setSavingBlock] = useState(false);

  const [confirm, setConfirm] = useState<{ kind: "window" | "blocked"; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** جلب خام بلا أي تحديث للحالة — يشترك فيه التحميل الأول والتحديث بعد التعديل. */
  const fetchState = useCallback(
    () => api.get<{ windows: Window[]; blocked: Blocked[] }>("/api/specialist/availability"),
    []
  );

  const load = useCallback(async () => {
    try {
      const res = await fetchState();
      setWindows(res.windows);
      setBlocked(res.blocked);
    } catch (e) {
      setLoadError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [fetchState]);

  // التحديث يقع بعد انتهاء الطلب، لا بشكل متزامن داخل التأثير.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchState();
        if (cancelled) return;
        setWindows(res.windows);
        setBlocked(res.blocked);
      } catch (e) {
        if (!cancelled) setLoadError(messageOf(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchState]);

  async function addWindow(e: React.FormEvent) {
    e.preventDefault();
    if (savingWindow) return;
    setWindowError(null);
    if (startTime >= endTime) {
      setWindowError("وقت النهاية يجب أن يكون بعد وقت البداية");
      return;
    }
    setSavingWindow(true);
    try {
      await api.post("/api/specialist/availability", {
        weekday: Number(weekday),
        startTime,
        endTime,
        slotMinutes: Number(slotMinutes),
      });
      toast.success("أُضيفت فترة الدوام");
      await load();
    } catch (e) {
      setWindowError(messageOf(e));
    } finally {
      setSavingWindow(false);
    }
  }

  async function addBlocked(e: React.FormEvent) {
    e.preventDefault();
    if (savingBlock) return;
    setBlockError(null);
    if (!blockDate) {
      setBlockError("اختر التاريخ");
      return;
    }
    if (!fullDay && blockStart >= blockEnd) {
      setBlockError("وقت النهاية يجب أن يكون بعد وقت البداية");
      return;
    }
    setSavingBlock(true);
    try {
      await api.post("/api/specialist/blocked-dates", {
        date: blockDate,
        fullDay,
        startTime: fullDay ? "" : blockStart,
        endTime: fullDay ? "" : blockEnd,
        reason: reason.trim(),
      });
      toast.success("أُضيف اليوم غير المتاح");
      setBlockDate("");
      setReason("");
      await load();
    } catch (e) {
      setBlockError(messageOf(e));
    } finally {
      setSavingBlock(false);
    }
  }

  async function remove() {
    if (!confirm || deleting) return;
    setDeleting(true);
    try {
      const url =
        confirm.kind === "window"
          ? `/api/specialist/availability/${confirm.id}`
          : `/api/specialist/blocked-dates/${confirm.id}`;
      await api.delete(url);
      toast.success("حُذف السجل");
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <SkeletonList rows={3} />;
  if (loadError) return <Alert tone="danger" title="تعذّر تحميل الأوقات">{loadError}</Alert>;

  return (
    <div className="space-y-10">
      {/* نوافذ الدوام */}
      <section aria-labelledby="windows-title">
        <h2 id="windows-title" className="text-lg font-bold text-slate-900">
          فترات الدوام الأسبوعية
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          تتكرّر كل أسبوع. يقسّمها النظام إلى فترات متساوية يختار منها الطالب.
        </p>

        {windows.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<Clock className="h-6 w-6" />}
              title="لم تُضف فترات دوام بعد"
              description="أضف فترة واحدة على الأقل ليتمكّن الطلاب من الحجز معك."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {windows.map((w) => (
              <li
                key={w.id}
                className="card flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">
                    {WEEKDAY_LABELS[w.weekday]}
                  </span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {formatArabicTime(w.startTime)} — {formatArabicTime(w.endTime)} · كل{" "}
                    {w.slotMinutes} دقيقة
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setConfirm({ kind: "window", id: w.id })}
                  className="shrink-0 cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-400 transition-colors hover:bg-danger-50 hover:text-danger-700"
                  aria-label={`حذف فترة ${WEEKDAY_LABELS[w.weekday]} ${w.startTime}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addWindow} className="card card-pad mt-4">
          <h3 className="text-sm font-bold text-slate-900">إضافة فترة</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="اليوم"
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
              options={WEEKDAY_LABELS.map((label, i) => ({ value: String(i), label }))}
            />
            <TextField
              label="من"
              type="time"
              dir="ltr"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <TextField
              label="إلى"
              type="time"
              dir="ltr"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
            <SelectField
              label="مدّة الموعد"
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(e.target.value)}
              options={[
                { value: "15", label: "15 دقيقة" },
                { value: "20", label: "20 دقيقة" },
                { value: "30", label: "30 دقيقة" },
                { value: "45", label: "45 دقيقة" },
                { value: "60", label: "60 دقيقة" },
              ]}
            />
          </div>
          {windowError ? (
            <div className="mt-4">
              <Alert tone="danger">{windowError}</Alert>
            </div>
          ) : null}
          <div className="mt-4">
            <SubmitButton loading={savingWindow}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              إضافة الفترة
            </SubmitButton>
          </div>
        </form>
      </section>

      {/* أيام غير متاحة */}
      <section aria-labelledby="blocked-title">
        <h2 id="blocked-title" className="text-lg font-bold text-slate-900">
          أيام وفترات غير متاحة
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          تستثني إجازة أو ارتباطاً من الأوقات المعروضة للطلاب.
        </p>

        {blocked.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<CalendarOff className="h-6 w-6" />}
              title="لا توجد أيام محجوبة"
              description="كل أيام دوامك متاحة للحجز حالياً."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {blocked.map((b) => {
              const iso = b.date.slice(0, 10);
              return (
                <li key={b.id} className="card flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-900">
                      {formatArabicDate(iso)}
                    </span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {b.fullDay
                        ? "اليوم كاملاً"
                        : `${formatArabicTime(b.startTime ?? "")} — ${formatArabicTime(b.endTime ?? "")}`}
                      {b.reason ? ` · ${b.reason}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirm({ kind: "blocked", id: b.id })}
                    className="shrink-0 cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-400 transition-colors hover:bg-danger-50 hover:text-danger-700"
                    aria-label={`حذف حجب ${iso}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={addBlocked} className="card card-pad mt-4">
          <h3 className="text-sm font-bold text-slate-900">إضافة يوم غير متاح</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label="التاريخ"
              type="date"
              dir="ltr"
              min={todayIso()}
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
            />
            <TextField
              label="السبب (اختياري)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="mt-4">
            <CheckboxField label="اليوم كاملاً" checked={fullDay} onChange={setFullDay} />
          </div>
          {!fullDay ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField
                label="من"
                type="time"
                dir="ltr"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
              />
              <TextField
                label="إلى"
                type="time"
                dir="ltr"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
              />
            </div>
          ) : null}
          {blockError ? (
            <div className="mt-4">
              <Alert tone="danger">{blockError}</Alert>
            </div>
          ) : null}
          <div className="mt-4">
            <SubmitButton loading={savingBlock}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              إضافة
            </SubmitButton>
          </div>
        </form>
      </section>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title="تأكيد الحذف"
        message="سيُحذف هذا السجل. الحجوزات المؤكّدة القائمة لا تتأثر."
        confirmLabel="حذف"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}
