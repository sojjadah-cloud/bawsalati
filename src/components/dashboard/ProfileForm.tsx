"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError, messageOf } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { Alert } from "@/components/ui/primitives";
import {
  CheckboxField,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/ui/form";

export interface ProfileValues {
  title: string;
  bio: string;
  notifyPhone: string;
  notifyEmail: string;
  bookable: boolean;
  slotMinutes: number;
}

/**
 * بيانات الأخصائي.
 *
 * الحقول النصّية غير محكومة بالحالة: الكتابة فيها لا تُعيد رسم النموذج
 * ولا تُهذَّب حرفاً حرفاً. كان الرقم يُنقّى من غير الأرقام مع كل ضغطة
 * والبريد يُقلَّم، فتختفي المسافة ساعة كتابتها ويقفز المؤشّر — فصار
 * التهذيب عند الحفظ وحده، وهو موضعه. والقيم تُقرأ من النموذج حينها.
 */
export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  // ما ليس نصّاً يبقى محكوماً: لا كتابة فيه فلا تقطيع
  const [bookable, setBookable] = useState(initial.bookable);
  const [slotMinutes, setSlotMinutes] = useState(initial.slotMinutes);

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

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
    try {
      await api.patch("/api/specialist/profile", {
        title: textValue("title").trim(),
        bio: textValue("bio").trim(),
        // التنقية هنا لا مع كل حرف: يكتب الأخصائي الرقم كما يشاء
        notifyPhone: textValue("notifyPhone").replace(/\D/gu, ""),
        notifyEmail: textValue("notifyEmail").trim(),
        bookable,
        slotMinutes,
      });
      toast.success("حُفظت بياناتك");
      setDirty(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.issues) {
        setErrors({
          title: err.fieldError("title"),
          notifyPhone: err.fieldError("notifyPhone"),
          notifyEmail: err.fieldError("notifyEmail"),
        });
      }
      setFormError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={save}
      onInput={() => {
        if (!dirty) setDirty(true);
      }}
      noValidate
      className="card card-pad space-y-5"
    >
      <TextField
        label="المسمّى المهني"
        required
        name="title"
        defaultValue={initial.title}
        error={errors.title}
        hint="يظهر للطلاب في صفحة حجز الموعد."
        maxLength={120}
      />

      <TextAreaField
        label="نبذة تعريفية"
        name="bio"
        defaultValue={initial.bio}
        hint="سطران يعرّفان الطالب بمجال خبرتك."
        maxLength={1000}
        rows={4}
      />

      <TextField
        label="رقم إشعار الحجز"
        type="tel"
        inputMode="numeric"
        dir="ltr"
        name="notifyPhone"
        defaultValue={initial.notifyPhone}
        error={errors.notifyPhone}
        hint="بصيغة دولية بلا رمز +، مثال 96892000000. لا يظهر هذا الرقم للطلاب إطلاقاً."
        maxLength={20}
      />

      <TextField
        label="بريد إشعار الحجز"
        type="email"
        dir="ltr"
        name="notifyEmail"
        defaultValue={initial.notifyEmail}
        error={errors.notifyEmail}
        hint="يصلك عليه إشعار كل حجز جديد. لا يظهر للطلاب، ويعمل مع رقم الواتساب لا بدلاً منه."
        maxLength={200}
      />

      <SelectField
        label="مدّة الموعد الافتراضية"
        value={String(slotMinutes)}
        onChange={(e) => {
          setSlotMinutes(Number(e.target.value));
          setDirty(true);
        }}
        options={[15, 20, 30, 45, 60].map((m) => ({ value: String(m), label: `${m} دقيقة` }))}
      />

      <div className="rounded-[var(--radius-md)] bg-slate-50 p-4">
        <CheckboxField
          label="أستقبل حجوزات جديدة من الطلاب"
          checked={bookable}
          onChange={(v) => {
            setBookable(v);
            setDirty(true);
          }}
        />
      </div>

      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <div className="flex items-center gap-3">
        <SubmitButton loading={saving}>حفظ التغييرات</SubmitButton>
        {dirty && !saving ? (
          <span className="text-sm text-[var(--color-muted)]">تغييراتٌ لم تُحفظ بعد</span>
        ) : null}
      </div>
    </form>
  );
}
