import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-brand-50 text-brand-700">
        <Compass className="h-8 w-8" aria-hidden="true" />
      </span>
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          قد يكون الرابط غير صحيح، أو انتهت صلاحيته.
        </p>
      </div>
      <Link href="/" className="btn-primary">
        العودة للرئيسية
      </Link>
    </div>
  );
}
