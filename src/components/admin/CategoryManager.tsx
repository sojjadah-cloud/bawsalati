"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiClientError, messageOf } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Alert, Badge } from "@/components/ui/primitives";
import { SubmitButton, TextAreaField, TextField } from "@/components/ui/form";

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  active: boolean;
  resourceCount: number;
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("10");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<CategoryRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await api.post("/api/admin/categories", {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        displayOrder: Number(displayOrder) || 0,
      });
      toast.success("أُضيف التصنيف");
      setOpen(false);
      setName("");
      setSlug("");
      setDescription("");
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

  async function toggleActive(category: CategoryRow) {
    if (busy) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/categories/${category.id}`, { active: !category.active });
      toast.success(category.active ? "عُطّل التصنيف" : "فُعّل التصنيف");
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
      await api.delete(`/api/admin/categories/${confirmDelete.id}`);
      toast.success("حُذف التصنيف");
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
          إضافة تصنيف
        </button>
      </div>

      <div className="table-wrap mt-4">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">التصنيف</th>
              <th scope="col">المعرّف</th>
              <th scope="col">الترتيب</th>
              <th scope="col">الموارد</th>
              <th scope="col">الحالة</th>
              <th scope="col">
                <span className="sr-only">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="block font-bold text-slate-900">{c.name}</span>
                  {c.description ? (
                    <span className="block text-xs text-[var(--color-muted)]">
                      {c.description}
                    </span>
                  ) : null}
                </td>
                <td dir="ltr" className="text-xs text-[var(--color-muted)]">
                  {c.slug}
                </td>
                <td className="tabular-nums">{c.displayOrder}</td>
                <td className="tabular-nums">{c.resourceCount}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => toggleActive(c)}
                    disabled={busy}
                    className="cursor-pointer"
                    aria-label={c.active ? `تعطيل ${c.name}` : `تفعيل ${c.name}`}
                  >
                    <Badge tone={c.active ? "success" : "neutral"}>
                      {c.active ? "ظاهر" : "مخفي"}
                    </Badge>
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(c)}
                    disabled={busy || c.resourceCount > 0}
                    className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-400 transition-colors hover:bg-danger-50 hover:text-danger-700 disabled:opacity-30"
                    aria-label={`حذف ${c.name}`}
                    title={c.resourceCount > 0 ? "يحوي موارد — عطّله بدل الحذف" : "حذف"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="إضافة تصنيف">
        <form onSubmit={create} noValidate className="space-y-5">
          <TextField
            label="اسم التصنيف"
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
            hint="يظهر في رابط الصفحة. حروف إنجليزية صغيرة وأرقام وشرطات."
          />
          <TextAreaField
            label="الوصف"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
          />
          <TextField
            label="ترتيب العرض"
            type="number"
            dir="ltr"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
          />

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
        title="حذف التصنيف"
        message={`سيُحذف «${confirmDelete?.name ?? ""}» نهائياً.`}
        confirmLabel="حذف"
        tone="danger"
        loading={busy}
      />
    </>
  );
}
