"use client";

import { useState } from "react";
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
  bookable: boolean;
  slotMinutes: number;
}

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await api.patch("/api/specialist/profile", {
        title: values.title.trim(),
        bio: values.bio.trim(),
        notifyPhone: values.notifyPhone.trim(),
        bookable: values.bookable,
        slotMinutes: values.slotMinutes,
      });
      toast.success("حُفظت بياناتك");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.issues) {
        setErrors({
          title: err.fieldError("title"),
          notifyPhone: err.fieldError("notifyPhone"),
        });
      }
      setFormError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="card card-pad space-y-5">
      <TextField
        label="المسمّى المهني"
        required
        value={values.title}
        onChange={(e) => set("title", e.target.value)}
        error={errors.title}
        hint="يظهر للطلاب في صفحة حجز الموعد."
        maxLength={120}
      />

      <TextAreaField
        label="نبذة تعريفية"
        value={values.bio}
        onChange={(e) => set("bio", e.target.value)}
        hint="سطران يعرّفان الطالب بمجال خبرتك."
        maxLength={1000}
        rows={4}
      />

      <TextField
        label="رقم إشعار الحجز"
        type="tel"
        inputMode="numeric"
        dir="ltr"
        value={values.notifyPhone}
        onChange={(e) => set("notifyPhone", e.target.value.replace(/\D/gu, ""))}
        error={errors.notifyPhone}
        hint="بصيغة دولية بلا رمز +، مثال 96892000000. لا يظهر هذا الرقم للطلاب إطلاقاً."
        maxLength={15}
      />

      <SelectField
        label="مدّة الموعد الافتراضية"
        value={String(values.slotMinutes)}
        onChange={(e) => set("slotMinutes", Number(e.target.value))}
        options={[15, 20, 30, 45, 60].map((m) => ({ value: String(m), label: `${m} دقيقة` }))}
      />

      <div className="rounded-[var(--radius-md)] bg-slate-50 p-4">
        <CheckboxField
          label="أستقبل حجوزات جديدة من الطلاب"
          checked={values.bookable}
          onChange={(v) => set("bookable", v)}
        />
      </div>

      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <SubmitButton loading={saving}>حفظ التغييرات</SubmitButton>
    </form>
  );
}
