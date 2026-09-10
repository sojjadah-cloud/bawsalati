"use client";

// تحليل الأخصائي وتوصيته واعتماد النتيجة.
// النصّ يكتبه الأخصائي بنفسه؛ النظام لا يولّد تحليلاً ولا توصية.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, RotateCcw } from "lucide-react";
import { api, messageOf } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { Alert, Badge } from "@/components/ui/primitives";
import { SubmitButton, TextAreaField } from "@/components/ui/form";

export function SpecialistAnalysis({
  sessionId,
  initialNotes,
  initialRecommendation,
  approvedAt,
  approvedByName,
}: {
  sessionId: string;
  initialNotes: string;
  initialRecommendation: string;
  approvedAt: string | null;
  approvedByName: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [notes, setNotes] = useState(initialNotes);
  const [recommendation, setRecommendation] = useState(initialRecommendation);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  const approved = !!approvedAt;

  async function send(payload: Record<string, unknown>) {
    setError(null);
    try {
      await api.patch(`/api/specialist/assessments/${sessionId}`, {
        specialistNotes: notes.trim(),
        recommendation: recommendation.trim(),
        ...payload,
      });
      router.refresh();
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    if (await send({})) toast.success("حُفظ التحليل");
    setSaving(false);
  }

  async function toggleApproval() {
    if (approving) return;
    setApproving(true);
    if (await send({ approve: !approved })) {
      toast.success(approved ? "سُحب الاعتماد" : "اعتُمدت النتيجة");
    }
    setApproving(false);
  }

  return (
    <section className="card card-pad" aria-labelledby="analysis-form">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="analysis-form" className="text-lg font-bold text-slate-900">
            تحليل الأخصائي
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            تُعرض هذه الملاحظات للطالب بعد اعتماد النتيجة.
          </p>
        </div>

        {approved ? (
          <Badge tone="success">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            معتمدة
          </Badge>
        ) : (
          <Badge tone="warning">بانتظار الاعتماد</Badge>
        )}
      </div>

      {approved ? (
        <p className="mt-3 text-xs text-[var(--color-muted)]">
          اعتمدها {approvedByName ?? "—"} بتاريخ {approvedAt?.slice(0, 10)}
        </p>
      ) : null}

      <form onSubmit={save} className="mt-5 space-y-5">
        <TextAreaField
          label="التحليل"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          hint="قراءتك لنتيجة الطالب ورمز ميوله."
          maxLength={4000}
          rows={5}
        />

        <TextAreaField
          label="التوصيات والمهن المقترحة"
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value)}
          hint="المهن المرتبطة برمز الطالب من دليل المهن، وما تنصحه به."
          maxLength={4000}
          rows={5}
        />

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div className="flex flex-wrap gap-3">
          <SubmitButton loading={saving}>حفظ التحليل</SubmitButton>

          <button
            type="button"
            onClick={toggleApproval}
            disabled={approving}
            className={approved ? "btn-outline" : "btn-secondary"}
            aria-busy={approving || undefined}
          >
            {approved ? (
              <>
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
                سحب الاعتماد
              </>
            ) : (
              <>
                <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                اعتماد النتيجة
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
