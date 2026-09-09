"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // تفاصيل الخطأ تبقى في سجل الخادم — لا تُعرض للمستخدم.
    console.error(error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-danger-50 text-danger-600">
        <AlertCircle className="h-8 w-8" aria-hidden="true" />
      </span>
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          حاول تحديث الصفحة. إذا تكرر الخطأ تواصل مع إدارة المنصة.
        </p>
      </div>
      <button type="button" onClick={reset} className="btn-primary">
        إعادة المحاولة
      </button>
    </div>
  );
}
