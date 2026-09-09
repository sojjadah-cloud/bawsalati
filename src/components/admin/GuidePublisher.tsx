"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { api, ApiClientError, messageOf } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { Alert, Spinner } from "@/components/ui/primitives";
import {
  CheckboxField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/ui/form";

const MAX_MB = 60;

export function GuidePublisher({ defaultTitle }: { defaultTitle: string }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [fileId, setFileId] = useState("");
  const [fileLabel, setFileLabel] = useState("");
  const [downloadable, setDownloadable] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function upload(file: File) {
    if (file.size > MAX_MB * 1024 * 1024) {
      setFormError(`حجم الملف يتجاوز ${MAX_MB} ميغابايت`);
      return;
    }
    setFormError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("kind", "GUIDE");
      form.append("file", file);
      const res = await api.upload<{ file: { id: string; originalName: string } }>(
        "/api/specialist/uploads",
        form
      );
      setFileId(res.file.id);
      setFileLabel(res.file.originalName);
      toast.success("اكتمل رفع الملف");
    } catch (e) {
      setFormError(messageOf(e));
    } finally {
      setUploading(false);
    }
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrors({});
    setFormError(null);

    if (!fileId && !externalUrl.trim()) {
      setFormError("ارفع ملف الدليل أو أضف رابطاً خارجياً.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/admin/guide", {
        title: title.trim(),
        description: description.trim(),
        fileId,
        externalUrl: externalUrl.trim(),
        downloadable,
        published: true,
      });
      toast.success("نُشر إصدار جديد من الدليل");
      setFileId("");
      setFileLabel("");
      setDescription("");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.issues) {
        setErrors({ title: err.fieldError("title"), externalUrl: err.fieldError("externalUrl") });
      }
      setFormError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={publish} noValidate className="card card-pad space-y-5">
      <h2 className="text-base font-bold text-slate-900">نشر إصدار جديد</h2>
      <p className="-mt-3 text-sm text-[var(--color-muted)]">
        الإصدار الجديد يحلّ محلّ المنشور حالياً، وتبقى الإصدارات السابقة محفوظة.
      </p>

      <TextField
        label="عنوان الدليل"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        maxLength={200}
      />

      <TextAreaField
        label="وصف مختصر"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={2000}
        rows={3}
      />

      <div>
        <span className="label">ملف الدليل (PDF)</span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-outline btn-sm cursor-pointer">
            {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            اختر ملفاً
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
          </label>
          <span className="text-xs text-[var(--color-muted)]">
            {fileLabel || `PDF حتى ${MAX_MB} ميغابايت`}
          </span>
        </div>
      </div>

      <TextField
        label="أو رابط خارجي"
        type="url"
        dir="ltr"
        value={externalUrl}
        onChange={(e) => setExternalUrl(e.target.value)}
        error={errors.externalUrl}
        placeholder="https://"
      />

      <div className="rounded-[var(--radius-md)] bg-slate-50 p-4">
        <CheckboxField
          label="السماح للطلاب بتنزيل الدليل"
          checked={downloadable}
          onChange={setDownloadable}
        />
      </div>

      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <SubmitButton loading={saving} disabled={uploading}>
        نشر الإصدار
      </SubmitButton>
    </form>
  );
}
