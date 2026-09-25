"use client";

// إضافة/تعديل مورد مكتبة، مع رفع الملفات والتحقق من الحقول.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { api, ApiClientError, messageOf } from "@/lib/client";
import { pdfFirstPageCover } from "@/lib/pdf-cover";
import { RESOURCE_TYPE_LABELS } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { Alert, Spinner } from "@/components/ui/primitives";
import {
  CheckboxField,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/ui/form";

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ResourceDraft {
  id?: string;
  categoryId: string;
  title: string;
  description: string;
  type: "READABLE" | "AUDIO" | "VIDEO" | "IMAGE" | "LINK" | "OTHER";
  author: string;
  publisher: string;
  publishedYear: string;
  externalUrl: string;
  fileId: string;
  audioFileId: string;
  coverFileId: string;
  downloadable: boolean;
  published: boolean;
}

const EMPTY = (categoryId: string): ResourceDraft => ({
  categoryId,
  title: "",
  description: "",
  type: "READABLE",
  author: "",
  publisher: "",
  publishedYear: "",
  externalUrl: "",
  fileId: "",
  audioFileId: "",
  coverFileId: "",
  downloadable: true,
  published: true,
});

const MAX_MB = { LIBRARY: 30, AUDIO: 60, BULLETIN: 60 };

export function ResourceEditor({
  categories,
  initial,
  trigger,
}: {
  categories: CategoryOption[];
  initial?: ResourceDraft;
  trigger?: "button" | "link";
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ResourceDraft>(initial ?? EMPTY(categories[0]?.id ?? ""));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"file" | "audio" | null>(null);
  const [fileLabel, setFileLabel] = useState("");
  const [audioLabel, setAudioLabel] = useState("");

  function set<K extends keyof ResourceDraft>(key: K, value: ResourceDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function upload(kind: "LIBRARY" | "AUDIO" | "BULLETIN", file: File) {
    const limit = MAX_MB[kind];
    if (file.size > limit * 1024 * 1024) {
      setFormError(`حجم الملف يتجاوز ${limit} ميغابايت`);
      return;
    }
    setFormError(null);
    setUploading(kind === "AUDIO" ? "audio" : "file");
    try {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      const res = await api.upload<{ file: { id: string; originalName: string } }>(
        "/api/specialist/uploads",
        form
      );
      if (kind === "LIBRARY" || kind === "BULLETIN") {
        set("fileId", res.file.id);
        setFileLabel(res.file.originalName);
        // غلاف الكتاب أوّل صفحة منه، يُولَّد هنا ويُرفع صورةً
        if (file.type === "application/pdf") {
          const cover = await pdfFirstPageCover(file);
          if (cover) {
            const coverForm = new FormData();
            coverForm.append("kind", "COVER");
            coverForm.append("file", cover);
            const uploaded = await api
              .upload<{ file: { id: string } }>("/api/specialist/uploads", coverForm)
              .catch(() => null);
            if (uploaded) set("coverFileId", uploaded.file.id);
          }
        }
      } else {
        set("audioFileId", res.file.id);
        setAudioLabel(res.file.originalName);
      }
      toast.success("اكتمل رفع الملف");
    } catch (e) {
      setFormError(messageOf(e));
    } finally {
      setUploading(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrors({});
    setFormError(null);

    const payload = {
      categoryId: draft.categoryId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      type: draft.type,
      author: draft.author.trim(),
      publisher: draft.publisher.trim(),
      publishedYear: draft.publishedYear,
      language: "ar",
      externalUrl: draft.externalUrl.trim(),
      fileId: draft.fileId,
      audioFileId: draft.audioFileId,
      coverFileId: draft.coverFileId,
      downloadable: draft.downloadable,
      published: draft.published,
    };

    setSaving(true);
    try {
      if (draft.id) {
        await api.patch(`/api/specialist/library/resources/${draft.id}`, {
          ...payload,
          kind: "full",
        });
        toast.success("حُدّث المورد");
      } else {
        await api.post("/api/specialist/library/resources", payload);
        toast.success("أُضيف المورد");
        setDraft(EMPTY(categories[0]?.id ?? ""));
        setFileLabel("");
        setAudioLabel("");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.issues) {
        setErrors({
          title: err.fieldError("title"),
          categoryId: err.fieldError("categoryId"),
          externalUrl: err.fieldError("externalUrl"),
          fileId: err.fieldError("fileId"),
          audioFileId: err.fieldError("audioFileId"),
        });
      }
      setFormError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {trigger === "link" ? (
        <button type="button" className="btn-outline btn-sm" onClick={() => setOpen(true)}>
          تعديل
        </button>
      ) : (
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          إضافة مورد
        </button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? "تعديل المورد" : "إضافة مورد جديد"}
        size="lg"
      >
        <form onSubmit={save} noValidate className="space-y-5">
          <TextField
            label="العنوان"
            required
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            error={errors.title}
            maxLength={250}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="التصنيف"
              required
              value={draft.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              error={errors.categoryId}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <SelectField
              label="نوع المورد"
              required
              value={draft.type}
              onChange={(e) => set("type", e.target.value as ResourceDraft["type"])}
              options={(["READABLE", "AUDIO", "VIDEO", "IMAGE", "LINK", "OTHER"] as const).map((t) => ({
                value: t,
                label: RESOURCE_TYPE_LABELS[t],
              }))}
            />
          </div>

          <TextAreaField
            label="الوصف"
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={3000}
            rows={4}
          />

          <div className="grid gap-5 sm:grid-cols-3">
            <TextField
              label="المؤلف"
              value={draft.author}
              onChange={(e) => set("author", e.target.value)}
              maxLength={160}
            />
            <TextField
              label="الناشر"
              value={draft.publisher}
              onChange={(e) => set("publisher", e.target.value)}
              maxLength={160}
            />
            <TextField
              label="سنة النشر"
              type="number"
              inputMode="numeric"
              dir="ltr"
              value={draft.publishedYear}
              onChange={(e) => set("publishedYear", e.target.value)}
            />
          </div>

          {/* الملفات */}
          {draft.type === "READABLE" || draft.type === "OTHER" ? (
            <div>
              <span className="label">ملف المستند (PDF)</span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-outline btn-sm cursor-pointer">
                  {uploading === "file" ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden="true" />
                  )}
                  اختر ملفاً
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload("LIBRARY", f);
                    }}
                  />
                </label>
                <span className="text-xs text-[var(--color-muted)]">
                  {fileLabel || (draft.fileId ? "ملف مرفق" : `PDF حتى ${MAX_MB.LIBRARY} ميغابايت`)}
                </span>
              </div>
              {errors.fileId ? <p className="field-error">{errors.fileId}</p> : null}
            </div>
          ) : null}

          {draft.type === "VIDEO" || draft.type === "IMAGE" ? (
            <div>
              <span className="label">
                {draft.type === "VIDEO" ? "ملف النشرة (MP4)" : "صورة النشرة (JPG / PNG / WEBP)"}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-outline btn-sm cursor-pointer">
                  {uploading === "file" ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden="true" />
                  )}
                  اختر ملفاً
                  <input
                    type="file"
                    accept={draft.type === "VIDEO" ? "video/mp4" : "image/jpeg,image/png,image/webp"}
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload("BULLETIN", f);
                    }}
                  />
                </label>
                <span className="text-xs text-[var(--color-muted)]">
                  {fileLabel ||
                    (draft.fileId ? "ملف مرفق" : `حتى ${MAX_MB.BULLETIN} ميغابايت، أو اكتفِ برابط`)}
                </span>
              </div>
              {errors.fileId ? <p className="field-error">{errors.fileId}</p> : null}
            </div>
          ) : null}

          {draft.type === "AUDIO" ? (
            <div>
              <span className="label">الملف الصوتي (MP3 / M4A)</span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-outline btn-sm cursor-pointer">
                  {uploading === "audio" ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden="true" />
                  )}
                  اختر ملفاً
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp4"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload("AUDIO", f);
                    }}
                  />
                </label>
                <span className="text-xs text-[var(--color-muted)]">
                  {audioLabel || (draft.audioFileId ? "ملف مرفق" : `حتى ${MAX_MB.AUDIO} ميغابايت`)}
                </span>
              </div>
              {errors.audioFileId ? <p className="field-error">{errors.audioFileId}</p> : null}
            </div>
          ) : null}

          <TextField
            label={draft.type === "LINK" ? "الرابط الخارجي" : "رابط خارجي (اختياري)"}
            required={draft.type === "LINK"}
            type="url"
            dir="ltr"
            value={draft.externalUrl}
            onChange={(e) => set("externalUrl", e.target.value)}
            error={errors.externalUrl}
            placeholder="https://"
          />

          <div className="space-y-3 rounded-[var(--radius-md)] bg-slate-50 p-4">
            <CheckboxField
              label="السماح للطلاب بتنزيل الملف"
              checked={draft.downloadable}
              onChange={(v) => set("downloadable", v)}
            />
            <CheckboxField
              label="منشور ويظهر للطلاب"
              checked={draft.published}
              onChange={(v) => set("published", v)}
            />
          </div>

          {formError ? <Alert tone="danger">{formError}</Alert> : null}

          <div className="flex justify-end gap-2 border-t border-[var(--color-line)] pt-4">
            <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
              إلغاء
            </button>
            <SubmitButton loading={saving} disabled={!!uploading}>
              {draft.id ? "حفظ التعديلات" : "إضافة المورد"}
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
