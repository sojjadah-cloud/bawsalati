"use client";

// قارئ دليل الطالب. الملف كبير، فلا يُحمَّل إلا بطلب صريح من المستخدم.
import { useState } from "react";
import { BookOpen, ExternalLink, Loader2 } from "lucide-react";

export function GuideReader({
  hasFile,
  externalUrl,
  title,
}: {
  hasFile: boolean;
  externalUrl: string | null;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!hasFile && externalUrl) {
    return (
      <div className="card card-pad">
        <p className="text-sm text-[var(--color-muted)]">
          الدليل مستضاف على موقع خارجي وسيُفتح في تبويب جديد.
        </p>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-4"
        >
          <ExternalLink className="h-5 w-5" aria-hidden="true" />
          فتح الدليل
        </a>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="card card-pad text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <BookOpen className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-base font-bold text-slate-900">اقرأ الدليل داخل الصفحة</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-muted)]">
          الملف كبير الحجم، لذا يُفتح عند طلبك فقط حتى لا يستهلك بياناتك دون داعٍ.
        </p>
        <button
          type="button"
          className="btn-primary mt-5"
          onClick={() => {
            setLoading(true);
            setOpen(true);
          }}
        >
          افتح الدليل
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {loading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-slate-50">
          <Loader2 className="h-7 w-7 animate-spin text-brand-700" aria-hidden="true" />
          <p className="text-sm text-[var(--color-muted)]">جارِ تحميل الدليل…</p>
        </div>
      ) : null}
      <iframe
        src="/api/files/guide"
        title={`عارض ${title}`}
        onLoad={() => setLoading(false)}
        className="h-[80vh] min-h-[30rem] w-full rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white"
      />
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        إن لم يظهر الدليل،{" "}
        <a
          href="/api/files/guide"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-brand-700 underline"
        >
          افتحه في تبويب جديد
        </a>
        .
      </p>
    </div>
  );
}
