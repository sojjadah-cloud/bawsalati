"use client";

// عارض/مشغّل المورد. يُحمَّل الملف الثقيل فقط عند طلب المستخدم صراحةً،
// فلا يُثقَل الجهاز ولا يُستهلك الاتصال دون داعٍ.
import { useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Headphones, Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/primitives";

interface Props {
  resourceId: string;
  title: string;
  hasFile: boolean;
  hasAudio: boolean;
  externalUrl: string | null;
}

export function ResourceViewer({ resourceId, title, hasFile, hasAudio, externalUrl }: Props) {
  const [openDoc, setOpenDoc] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);

  if (hasAudio) {
    return (
      <div className="card card-pad">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Headphones className="h-5 w-5 text-brand-700" aria-hidden="true" />
          الاستماع
        </h2>
        <audio
          controls
          preload="none"
          className="mt-4 w-full"
          onError={() => setAudioError(true)}
          aria-label={`مشغّل الكتاب المسموع: ${title}`}
        >
          <source src={`/api/files/library/${resourceId}?kind=audio`} />
          متصفّحك لا يدعم تشغيل الصوت.
        </audio>
        {audioError ? (
          <div className="mt-4">
            <Alert tone="danger" title="تعذّر تشغيل الملف">
              حاول تحديث الصفحة، أو تواصل مع مختص التوجيه المهني إذا استمرت المشكلة.
            </Alert>
          </div>
        ) : null}
      </div>
    );
  }

  if (hasFile) {
    return (
      <div className="card card-pad">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <BookOpen className="h-5 w-5 text-brand-700" aria-hidden="true" />
          القراءة
        </h2>

        {!openDoc ? (
          <>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              افتح المستند للقراءة داخل الصفحة.
            </p>
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => {
                setDocLoading(true);
                setOpenDoc(true);
              }}
            >
              افتح المستند
            </button>
          </>
        ) : (
          <div className="relative mt-4">
            {docLoading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-md)] bg-slate-50">
                <Loader2 className="h-6 w-6 animate-spin text-brand-700" aria-hidden="true" />
                <span className="sr-only">جارِ تحميل المستند</span>
              </div>
            ) : null}
            <iframe
              src={`/api/files/library/${resourceId}?kind=file`}
              title={`عارض المستند: ${title}`}
              onLoad={() => setDocLoading(false)}
              className="h-[70vh] min-h-96 w-full rounded-[var(--radius-md)] border border-[var(--color-line)] bg-white"
            />
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              إن لم يظهر المستند،{" "}
              <a
                href={`/api/files/library/${resourceId}?kind=file`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-brand-700 underline"
              >
                افتحه في تبويب جديد
              </a>
              .
            </p>
          </div>
        )}
      </div>
    );
  }

  if (externalUrl) {
    return (
      <div className="card card-pad">
        <h2 className="text-base font-bold text-slate-900">رابط المورد</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          هذا المورد مستضاف على موقع خارجي وسيُفتح في تبويب جديد.
        </p>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-4"
        >
          <ExternalLink className="h-5 w-5" aria-hidden="true" />
          فتح المورد
        </a>
      </div>
    );
  }

  return (
    <div className="card card-pad">
      <h2 className="text-base font-bold text-slate-900">مُدرَج في الفهرس</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        هذا العنوان مسجّل في المكتبة ولم تُرفق نسخته بعد. اطلبه من مختص التوجيه
        المهني ليرفعه أو يدلّك على نسخة متاحة.
      </p>
      <Link href="/booking" className="btn-outline mt-4">
        اسأل المختص عن هذا الكتاب
      </Link>
    </div>
  );
}
