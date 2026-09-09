"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, messageOf } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { Alert } from "@/components/ui/primitives";
import { SubmitButton, TextAreaField, TextField } from "@/components/ui/form";

export interface SettingField {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
  dir?: "ltr" | "rtl";
}

export function SettingsForm({
  fields,
  values,
}: {
  fields: SettingField[];
  values: Record<string, string>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<Record<string, string>>(values);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    setSaving(true);
    try {
      await api.patch("/api/admin/settings", {
        entries: fields.map((f) => ({ key: f.key, value: (draft[f.key] ?? "").trim() })),
      });
      toast.success("حُفظت الإعدادات");
      router.refresh();
    } catch (e2) {
      setFormError(messageOf(e2));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card card-pad space-y-5">
      {fields.map((f) =>
        f.multiline ? (
          <TextAreaField
            key={f.key}
            label={f.label}
            hint={f.hint}
            dir={f.dir}
            value={draft[f.key] ?? ""}
            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            maxLength={1000}
            rows={3}
          />
        ) : (
          <TextField
            key={f.key}
            label={f.label}
            hint={f.hint}
            dir={f.dir}
            value={draft[f.key] ?? ""}
            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            maxLength={1000}
          />
        )
      )}

      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <SubmitButton loading={saving}>حفظ الإعدادات</SubmitButton>
    </form>
  );
}
