"use client";

// إدارة بنك أسئلة «اسألني»: إضافة وتعديل وحذف، ومراجعة ما لم يجد له جواباً.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { api, messageOf } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { FaqEditorDialog, type FaqDraft } from "./FaqEditorDialog";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Badge, EmptyState } from "@/components/ui/primitives";

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

const EMPTY: FaqDraft = { question: "", answer: "", keywords: "", topic: "", active: true };

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
  const [draft, setDraft] = useState<FaqDraft>(EMPTY);

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
    setOpen(true);
  }

  function create(question = "") {
    setDraft({ ...EMPTY, question });
    setOpen(true);
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
            أسئلة لم يجد «اسألني» لها جواباً ({unanswered.length})
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            سألها الطلاب فعلاً. أضف جواباً ليجدها «اسألني» في المرة القادمة.
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
            description="أضف سؤالاً وجوابه ليبدأ «اسألني» بالإجابة على الطلاب."
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

      <FaqEditorDialog
        open={open}
        draft={draft}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />

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
