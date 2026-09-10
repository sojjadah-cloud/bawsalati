"use client";

// إدارة بنك أسئلة جويب: إضافة وتعديل وحذف، ومراجعة ما لم يجد له جواباً.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { api, ApiClientError, messageOf } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Alert, Badge, EmptyState } from "@/components/ui/primitives";
import { CheckboxField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  topic: string;
  active: boolean;
  matchCount: number;
}

export interface UnansweredRow {
  id: string;
  text: string;
  askCount: number;
}

interface Draft {
  id?: string;
  question: string;
  answer: string;
  keywords: string;
  topic: string;
  active: boolean;
}

const EMPTY: Draft = { question: "", answer: "", keywords: "", topic: "", active: true };

export function FaqManager({
  entries,
  unanswered,
}: {
  entries: FaqRow[];
  unanswered: UnansweredRow[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<FaqRow | null>(null);
  const [busy, setBusy] = useState(false);

  function edit(entry: FaqRow) {
    setDraft({
      id: entry.id,
      question: entry.question,
      answer: entry.answer,
      keywords: entry.keywords.join("\n"),
      topic: entry.topic,
      active: entry.active,
    });
    setErrors({});
    setFormError(null);
    setOpen(true);
  }

  function create(question = "") {
    setDraft({ ...EMPTY, question });
    setErrors({});
    setFormError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrors({});
    setFormError(null);
    setSaving(true);

    const payload = {
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      keywords: draft.keywords.trim(),
      topic: draft.topic.trim(),
      active: draft.active,
    };

    try {
      if (draft.id) {
        await api.patch(`/api/specialist/faq/${draft.id}`, payload);
        toast.success("حُدّث السؤال");
      } else {
        await api.post("/api/specialist/faq", payload);
        toast.success("أُضيف السؤال");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.issues) {
        setErrors({
          question: err.fieldError("question"),
          answer: err.fieldError("answer"),
        });
      }
      setFormError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmDelete || busy) return;
    setBusy(true);
    try {
      await api.delete(`/api/specialist/faq/${confirmDelete.id}`);
      toast.success("حُذف السؤال");
      setConfirmDelete(null);
      router.refresh();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function dismiss(id: string) {
    try {
      await api.delete(`/api/specialist/faq/unanswered/${id}`);
      router.refresh();
    } catch (e) {
      toast.error(messageOf(e));
    }
  }

  return (
    <>
      {unanswered.length > 0 ? (
        <section className="mb-8" aria-labelledby="unanswered-title">
          <h2 id="unanswered-title" className="text-base font-bold text-slate-900">
            أسئلة لم يجد جويب لها جواباً ({unanswered.length})
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            سألها الطلاب فعلاً. أضف جواباً ليجدها جويب في المرة القادمة.
          </p>

          <ul className="card mt-3 divide-y divide-[var(--color-line)]">
            {unanswered.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-sm text-slate-800">{u.text}</span>
                  <span className="text-xs text-[var(--color-faint)]">
                    سُئل {u.askCount} مرة
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    onClick={() => create(u.text)}
                  >
                    أضف جواباً
                  </button>
                  <button
                    type="button"
                    onClick={() => dismiss(u.id)}
                    className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="تجاهل"
                    title="تجاهل"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={() => create()}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          إضافة سؤال
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="بنك الأسئلة فارغ"
            description="أضف سؤالاً وجوابه ليبدأ جويب بالإجابة على الطلاب."
          />
        </div>
      ) : (
        <div className="table-wrap mt-4">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">السؤال</th>
                <th scope="col" className="w-32">الموضوع</th>
                <th scope="col" className="w-24">مرات المطابقة</th>
                <th scope="col" className="w-24">الحالة</th>
                <th scope="col" className="w-24">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span className="block font-bold text-slate-900">{entry.question}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--color-muted)]">
                      {entry.answer}
                    </span>
                  </td>
                  <td className="text-xs">{entry.topic || "—"}</td>
                  <td className="tabular-nums">{entry.matchCount}</td>
                  <td>
                    <Badge tone={entry.active ? "success" : "neutral"}>
                      {entry.active ? "فعّال" : "معطّل"}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => edit(entry)}
                        className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        aria-label={`تعديل ${entry.question}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(entry)}
                        className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-400 transition-colors hover:bg-danger-50 hover:text-danger-700"
                        aria-label={`حذف ${entry.question}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? "تعديل السؤال" : "إضافة سؤال"}
        size="lg"
      >
        <form onSubmit={save} noValidate className="space-y-5">
          <TextField
            label="السؤال"
            required
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            error={errors.question}
            maxLength={300}
          />

          <TextAreaField
            label="الجواب"
            required
            value={draft.answer}
            onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            error={errors.answer}
            maxLength={3000}
            rows={6}
          />

          <TextAreaField
            label="صيغ أخرى للسؤال"
            value={draft.keywords}
            onChange={(e) => setDraft({ ...draft, keywords: e.target.value })}
            hint="صيغة في كل سطر. تساعد جويب على التعرّف على السؤال مهما اختلفت كلماته."
            maxLength={1000}
            rows={4}
          />

          <TextField
            label="الموضوع"
            value={draft.topic}
            onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
            hint="لتجميع الأسئلة المتقاربة، مثل: الاختبار، المكتبة، المواعيد."
            maxLength={80}
          />

          <div className="rounded-[var(--radius-md)] bg-slate-50 p-4">
            <CheckboxField
              label="فعّال — يجيب به جويب على الطلاب"
              checked={draft.active}
              onChange={(v) => setDraft({ ...draft, active: v })}
            />
          </div>

          {formError ? <Alert tone="danger">{formError}</Alert> : null}

          <div className="flex justify-end gap-2 border-t border-[var(--color-line)] pt-4">
            <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
              إلغاء
            </button>
            <SubmitButton loading={saving}>{draft.id ? "حفظ" : "إضافة"}</SubmitButton>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        title="حذف السؤال"
        message={`سيُحذف «${confirmDelete?.question ?? ""}» من بنك الأسئلة.`}
        confirmLabel="حذف"
        tone="danger"
        loading={busy}
      />
    </>
  );
}
