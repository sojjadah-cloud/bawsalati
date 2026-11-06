"use client";

// نموذج تحرير سؤال «اسألني» — منفصلٌ عن قائمة الأسئلة بقصد.
//
// كان النموذج داخل FaqManager نفسه وحقوله محكومة بالحالة، فكل حرف
// يُكتب يُعيد رسم المكوّن كلّه — وفيه جدول الأسئلة كلّها وقائمة ما لم
// يُجَب عنه. فيتقطّع الإدخال ويبدو كأنّ النظام «يحدّث مع كل حرف».
//
// الآن: مكوّنٌ مستقل، وحقوله النصّية غير محكومة (defaultValue + name)
// تُقرأ من النموذج عند الحفظ. الكتابة لا تُعيد رسم شيء، ولا يُرسَل
// إلى الخادم إلا عند الضغط على «حفظ».

import { useRef, useState } from "react";
import { api, ApiClientError, messageOf } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { Alert } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/Dialog";
import { CheckboxField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";

export interface FaqDraft {
  id?: string;
  question: string;
  answer: string;
  keywords: string;
  topic: string;
  active: boolean;
}

export function FaqEditorDialog({
  open,
  draft,
  onClose,
  onSaved,
}: {
  open: boolean;
  draft: FaqDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [active, setActive] = useState(draft.active);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // يتبدّل السؤال المعروض فتُعاد تهيئة الحقول غير المحكومة
  const [seeded, setSeeded] = useState(draft);
  if (seeded !== draft) {
    setSeeded(draft);
    setActive(draft.active);
    setErrors({});
    setFormError(null);
  }

  function textValue(name: string): string {
    const el = formRef.current?.elements.namedItem(name);
    return el && "value" in el ? String((el as unknown as { value: unknown }).value ?? "") : "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrors({});
    setFormError(null);
    setSaving(true);

    const payload = {
      question: textValue("question").trim(),
      answer: textValue("answer").trim(),
      keywords: textValue("keywords").trim(),
      topic: textValue("topic").trim(),
      active,
    };

    try {
      if (draft.id) {
        await api.patch(`/api/specialist/faq/${draft.id}`, payload);
        toast.success("حُدّث السؤال");
      } else {
        await api.post("/api/specialist/faq", payload);
        toast.success("أُضيف السؤال");
      }
      onSaved();
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={draft.id ? "تعديل السؤال" : "إضافة سؤال"}
      size="lg"
    >
      {/* المفتاح يُعيد تركيب الحقول غير المحكومة عند تبدّل السؤال */}
      <form
        key={draft.id ?? "new"}
        ref={formRef}
        onSubmit={save}
        noValidate
        className="space-y-5"
      >
        <TextField
          label="السؤال"
          required
          name="question"
          defaultValue={draft.question}
          error={errors.question}
          maxLength={300}
        />

        <TextAreaField
          label="الجواب"
          required
          name="answer"
          defaultValue={draft.answer}
          error={errors.answer}
          maxLength={3000}
          rows={6}
        />

        <TextAreaField
          label="صيغ أخرى للسؤال"
          name="keywords"
          defaultValue={draft.keywords}
          hint="صيغة في كل سطر. تساعد «اسألني» على التعرّف على السؤال مهما اختلفت كلماته."
          maxLength={1000}
          rows={4}
        />

        <TextField
          label="الموضوع"
          name="topic"
          defaultValue={draft.topic}
          hint="لتجميع الأسئلة المتقاربة، مثل: الاختبار، المكتبة، المواعيد."
          maxLength={80}
        />

        <div className="rounded-[var(--radius-md)] bg-slate-50 p-4">
          <CheckboxField
            label="فعّال — يجيب به «اسألني» على الطلاب"
            checked={active}
            onChange={setActive}
          />
        </div>

        {formError ? <Alert tone="danger">{formError}</Alert> : null}

        <div className="flex justify-end gap-2 border-t border-[var(--color-line)] pt-4">
          <button type="button" className="btn-outline" onClick={onClose}>
            إلغاء
          </button>
          <SubmitButton loading={saving}>{draft.id ? "حفظ" : "إضافة"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
