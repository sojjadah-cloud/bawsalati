"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Eye, EyeOff } from "lucide-react";
import { api, messageOf } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/Dialog";

export function ResourceRowActions({
  resourceId,
  title,
  published,
  archived,
}: {
  resourceId: string;
  title: string;
  published: boolean;
  archived: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  async function togglePublish() {
    if (busy) return;
    setBusy(true);
    try {
      await api.patch(`/api/specialist/library/resources/${resourceId}`, {
        kind: "publish",
        published: !published,
      });
      toast.success(published ? "أُخفي المورد عن الطلاب" : "نُشر المورد");
      router.refresh();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    if (busy) return;
    setBusy(true);
    try {
      await api.patch(`/api/specialist/library/resources/${resourceId}`, {
        kind: "archive",
        archived: !archived,
      });
      toast.success(archived ? "أُعيد المورد من الأرشيف" : "أُرشف المورد");
      setConfirmArchive(false);
      router.refresh();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={togglePublish}
          disabled={busy || archived}
          className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          aria-label={published ? `إخفاء ${title}` : `نشر ${title}`}
          title={published ? "إخفاء عن الطلاب" : "نشر للطلاب"}
        >
          {published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => (archived ? void toggleArchive() : setConfirmArchive(true))}
          disabled={busy}
          className="cursor-pointer rounded-[var(--radius-sm)] p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          aria-label={archived ? `استعادة ${title}` : `أرشفة ${title}`}
          title={archived ? "استعادة من الأرشيف" : "أرشفة"}
        >
          {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        </button>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={toggleArchive}
        title="أرشفة المورد"
        message={`سيُخفى «${title}» عن الطلاب ويبقى في الأرشيف. يمكنك استعادته لاحقاً.`}
        confirmLabel="أرشفة"
        tone="danger"
        loading={busy}
      />
    </>
  );
}
