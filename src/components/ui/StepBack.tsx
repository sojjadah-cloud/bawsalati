"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * رجوعٌ خطوةً واحدة داخل الصفحة.
 *
 * في أول خطوة لا يوجد ما يُرجَع إليه داخل الصفحة، فيصير الزرّ رابطاً إلى
 * الصفحة السابقة المكتوبة في `exit`، لا إلى تاريخ المتصفّح: الطالب قد يفتح
 * الرابط مباشرةً من رسالة فلا يكون خلفه شيء.
 */
export function StepBack({
  label,
  onBack,
  exit,
}: {
  /** اسم الخطوة السابقة، أو الوجهة عند أول خطوة */
  label: string;
  /** يُترك فارغاً في أول خطوة */
  onBack?: () => void;
  exit: { href: string; label: string };
}) {
  const className =
    "no-print mb-4 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] px-2 text-sm font-bold text-brand-800 transition-colors hover:bg-brand-50";

  if (!onBack) {
    return (
      <Link href={exit.href} className={className}>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        رجوع إلى {exit.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onBack} className={className}>
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
      رجوع إلى {label}
    </button>
  );
}
