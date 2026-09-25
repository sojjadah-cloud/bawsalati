"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { api, messageOf } from "@/lib/client";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField, SubmitButton } from "@/components/ui/form";

const STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

export function AppointmentActions({
  appointmentId,
  status,
  notes,
  studentName,
}: {
  appointmentId: string;
  status: string;
  notes: string | null;
  studentName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");
  const [saving, setSaving] = useState(false);

  async function changeStatus(next: string) {
    if (next === status || busy) return;
    setBusy(true);
    try {
      await api.patch(`/api/specialist/appointments/${appointmentId}`, {
        kind: "status",
        status: next,
      });
      toast.success(`تم تحديث الحالة إلى «${APPOINTMENT_STATUS_LABELS[next]}»`);
      router.refresh();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.patch(`/api/specialist/appointments/${appointmentId}`, {
        kind: "notes",
        specialistNotes: draft.trim(),
      });
      toast.success("حُفظت الملاحظات");
      setNotesOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`status-${appointmentId}`}>
        حالة حجز {studentName}
      </label>
      <select
        id={`status-${appointmentId}`}
        className="select w-36 text-xs"
        value={status}
        disabled={busy}
        onChange={(e) => changeStatus(e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {APPOINTMENT_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="btn-outline btn-sm"
        onClick={() => setNotesOpen(true)}
        aria-label={`ملاحظات حجز ${studentName}`}
      >
        <NotebookPen className="h-4 w-4" aria-hidden="true" />
        ملاحظات
      </button>

      <Dialog
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        title={`ملاحظات — ${studentName}`}
        description="تبقى هذه الملاحظات داخل لوحتك ولا يراها الطالب."
      >
        <form onSubmit={saveNotes}>
          <TextAreaField
            label="ملاحظات الأخصائي"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={4000}
            rows={6}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={() => setNotesOpen(false)}>
              إلغاء
            </button>
            <SubmitButton loading={saving}>حفظ</SubmitButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
