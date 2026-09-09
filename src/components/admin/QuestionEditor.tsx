"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { api, messageOf } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";

export function QuestionEditor({
  questionId,
  number,
  text,
  active,
}: {
  questionId: string;
  number: number;
  text: string;
  active: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy) return;
    const value = draft.trim();
    if (value.length < 5) {
      toast.error("نص العبارة قصير جداً");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/api/admin/questions/${questionId}`, { text: value });
      toast.success(`حُدّثت العبارة ${number}`);
      setEditing(false);
      router.refresh();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (busy) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/questions/${questionId}`, { active: !active });
      toast.success(active ? "عُطّلت العبارة" : "فُعّلت العبارة");
      router.refresh();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-start gap-2">
        <label className="sr-only" htmlFor={`q-${questionId}`}>
          نص العبارة {number}
        </label>
        <textarea
          id={`q-${questionId}`}
          className="textarea min-h-16 flex-1 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={400}
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-success-700 hover:bg-success-50"
          aria-label="حفظ"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(text);
            setEditing(false);
          }}
          disabled={busy}
          className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-500 hover:bg-slate-100"
          aria-label="إلغاء"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <span className={active ? "text-slate-700" : "text-[var(--color-faint)] line-through"}>
        {text}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label={`تعديل العبارة ${number}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleActive}
          disabled={busy}
          className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
            active ? "bg-success-50 text-success-700" : "bg-slate-100 text-slate-500"
          }`}
          aria-label={active ? `تعطيل العبارة ${number}` : `تفعيل العبارة ${number}`}
        >
          {active ? "فعّالة" : "معطّلة"}
        </button>
      </span>
    </div>
  );
}
