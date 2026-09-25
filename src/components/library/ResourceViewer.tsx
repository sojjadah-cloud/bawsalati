"use client";

// عارض المورد. الملف الثقيل لا يُحمَّل إلا عند طلب المستخدم صراحةً،
// فلا يُثقَل الجهاز ولا يُستهلك الاتصال دون داعٍ.
import { useState } from "react";
import Link from "next/link";
import { BookOpen, Download, Image as ImageIcon, Loader2, Play } from "lucide-react";

interface Props {
  resourceId: string;
  title: string;
  type: string;
  hasFile: boolean;
  downloadable: boolean;
}

export function ResourceViewer({ resourceId, title, type, hasFile, downloadable }: Props) {
  const [openDoc, setOpenDoc] = useState(false);
  const [docLoading, setDocLoading] = useState(false);

  const fileUrl = `/api/files/library/${resourceId}?kind=file`;
  const downloadUrl = `${fileUrl}&mode=download`;

  if (!hasFile) {
    return (
      <div className="card card-pad">
        <h2 className="text-base font-bold text-slate-900">لم تُرفَق نسخة بعد</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          هذا العنوان مسجّل في المكتبة ولم يُرفع ملفه بعد. اسأل أخصائي التوجيه المهني عنه.
        </p>
        <Link href="/booking" className="btn-outline mt-4">
          احجز موعداً مع الأخصائي
        </Link>
      </div>
    );
  }

  // النشرة المرئية تُشغَّل في الصفحة، ولا تُحمَّل قبل أن يطلبها المستخدم.
  if (type === "VIDEO") {
    return (
      <div className="card card-pad">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Play className="h-5 w-5 text-brand-700" aria-hidden="true" />
          مشاهدة النشرة
        </h2>
        <video
          controls
          preload="none"
          playsInline
          className="mt-4 w-full rounded-[var(--radius-md)] bg-black"
          aria-label={`نشرة مرئية: ${title}`}
        >
          <source src={fileUrl} type="video/mp4" />
          متصفّحك لا يدعم تشغيل المقاطع المرئية.
        </video>
        {downloadable ? (
          <a href={downloadUrl} className="btn-outline mt-4">
            <Download className="h-5 w-5" aria-hidden="true" />
            تنزيل النشرة
          </a>
        ) : null}
      </div>
    );
  }

  // النشرة المصوّرة: تصفّحٌ وتنزيل، لا أكثر.
  if (type === "IMAGE") {
    return (
      <div className="card card-pad">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <ImageIcon className="h-5 w-5 text-brand-700" aria-hidden="true" />
          النشرة
        </h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={title}
          className="mt-4 w-full rounded-[var(--radius-md)] border border-[var(--color-line)]"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
            تصفّح الصورة
          </a>
          {downloadable ? (
            <a href={downloadUrl} className="btn-primary">
              <Download className="h-5 w-5" aria-hidden="true" />
              تنزيل الصورة
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  // الكتاب: زرّ تصفّح داخل الصفحة وزرّ تنزيل.
  return (
    <div className="card card-pad">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <BookOpen className="h-5 w-5 text-brand-700" aria-hidden="true" />
        الكتاب
      </h2>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setDocLoading(!openDoc);
            setOpenDoc((v) => !v);
          }}
        >
          <BookOpen className="h-5 w-5" aria-hidden="true" />
          {openDoc ? "إغلاق التصفّح" : "تصفّح الكتاب"}
        </button>
        {downloadable ? (
          <a href={downloadUrl} className="btn-outline">
            <Download className="h-5 w-5" aria-hidden="true" />
            تنزيل الكتاب
          </a>
        ) : null}
      </div>

      {openDoc ? (
        <div className="relative mt-4">
          {docLoading ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-md)] bg-slate-50">
              <Loader2 className="h-6 w-6 animate-spin text-brand-700" aria-hidden="true" />
              <span className="sr-only">جارِ تحميل الكتاب</span>
            </div>
          ) : null}
          <iframe
            src={fileUrl}
            title={`تصفّح: ${title}`}
            onLoad={() => setDocLoading(false)}
            className="h-[70vh] min-h-96 w-full rounded-[var(--radius-md)] border border-[var(--color-line)] bg-white"
          />
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            إن لم يظهر الكتاب،{" "}
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-brand-700 underline"
            >
              افتحه في تبويب جديد
            </a>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}
