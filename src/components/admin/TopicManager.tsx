"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiClientError, messageOf } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { Alert, Badge } from "@/components/ui/primitives";
import { CheckboxField, SubmitButton, TextField } from "@/components/ui/form";

export interface TopicRow {
  id: string;
  name: string;
  slug: string;
  requiresDetails: boolean;
  displayOrder: number;
  active: boolean;
  usageCount: number;
}

export function TopicManager({ topics }: { topics: TopicRow[] }) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [requiresDetails, setRequiresDetails] = useState(false);
  const [displayOrder, setDisplayOrder] = useState("10");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<TopicRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await api.post("/api/admin/topics", {
        name: name.trim(),
        slug: slug.trim(),
        requiresDetails,
        displayOrder: Number(displayOrder) || 0,
      });
      toast.success("أُضيف الموضوع");
      setOpen(false);
      setName("");
      setSlug("");
      setRequiresDetails(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.issues) {
        setErrors({ name: err.fieldError("name"), slug: err.fieldError("slug") });
      }
      setFormError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(topic: TopicRow) {
    if (busy) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/topics/${topic.id}`, { active: !topic.active });
      toast.success(topic.active ? "عُطّل الموضوع" : "فُعّل الموضوع");
      router.refresh();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDelete || busy) return;
    setBusy(true);
    try {
      await api.delete(`/api/admin/topics/${confirmDelete.id}`);
      toast.success("حُذف الموضوع");
      setConfirmDelete(null);
      router.refresh();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          إضافة موضوع
        </button>
      </div>

      <div className="table-wrap mt-4">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">الموضوع</th>
              <th scope="col">المعرّف</th>
              <th scope="col">يطلب تفاصيل</th>
              <th scope="col">الترتيب</th>
              <th scope="col">الحجوزات</th>
              <th scope="col">الحالة</th>
              <th scope="col">
                <span className="sr-only">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id}>
                <td className="font-bold text-slate-900">{t.name}</td>
                <td dir="ltr" className="text-xs text-[var(--color-muted)]">
                  {t.slug}
                </td>
                <td>{t.requiresDetails ? "نعم" : "لا"}</td>
                <td className="tabular-nums">{t.displayOrder}</td>
                <td className="tabular-nums">{t.usageCount}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => toggleActive(t)}
                    disabled={busy}
                    className="cursor-pointer"
                    aria-label={t.active ? `تعطيل ${t.name}` : `تفعيل ${t.name}`}
                  >
                    <Badge tone={t.active ? "success" : "neutral"}>
                      {t.active ? "فعّال" : "معطّل"}
                    </Badge>
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(t)}
                    disabled={busy || t.usageCount > 0}
                    className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-400 transition-colors hover:bg-danger-50 hover:text-danger-700 disabled:opacity-30"
                    aria-label={`حذف ${t.name}`}
                    title={t.usageCount > 0 ? "مرتبط بحجوزات — عطّله بدل الحذف" : "حذف"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="إضافة موضوع استشارة">
        <form onSubmit={create} noValidate className="space-y-5">
          <TextField
            label="اسم الموضوع"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            maxLength={120}
          />
          <TextField
            label="المعرّف"
            required
            dir="ltr"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/gu, "-"))}
            error={errors.slug}
            hint="حروف إنجليزية صغيرة وأرقام وشرطات فقط."
          />
          <TextField
            label="ترتيب العرض"
            type="number"
            dir="ltr"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
          />
          <div className="rounded-[var(--radius-md)] bg-slate-50 p-4">
            <CheckboxField
              label="يطلب من الطالب كتابة تفاصيل إضافية (مثل خيار «أخرى»)"
              checked={requiresDetails}
              onChange={setRequiresDetails}
            />
          </div>

          {formError ? <Alert tone="danger">{formError}</Alert> : null}

          <div className="flex justify-end gap-2 border-t border-[var(--color-line)] pt-4">
            <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
              إلغاء
            </button>
            <SubmitButton loading={saving}>إضافة</SubmitButton>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        title="حذف الموضوع"
        message={`سيُحذف «${confirmDelete?.name ?? ""}» نهائياً.`}
        confirmLabel="حذف"
        tone="danger"
        loading={busy}
      />
    </>
  );
}
