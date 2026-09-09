"use client";

// حوار متاح: تركيز محبوس، إغلاق بـ Esc، إعادة التركيز للعنصر الأصلي.
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, handleKey]);

  if (!open) return null;

  const width = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/45"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`animate-in relative w-full ${width} max-h-[90vh] overflow-y-auto rounded-t-[var(--radius-xl)] bg-white shadow-[var(--shadow-lg)] sm:rounded-[var(--radius-xl)]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-[var(--color-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-[var(--radius-sm)] p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children ? <div className="px-5 py-5">{children}</div> : null}
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-line)] bg-slate-50 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "تأكيد",
  tone = "primary",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>
            إلغاء
          </button>
          <button
            type="button"
            className={tone === "danger" ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading || undefined}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-700">{message}</p>
    </Dialog>
  );
}
