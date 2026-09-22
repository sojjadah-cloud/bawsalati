"use client";

// أيقونة عائمة تفتح صفحة «اسألني». أُخرجت من قائمة التنقّل لأنها مساعد
// يُطلب عند الحاجة في أي صفحة، لا قسماً من أقسام المنصة.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";

/** صفحات تُخفى فيها الأيقونة: صفحة «اسألني» نفسها، وشاشة الاختبار ذات الشريط السفلي. */
const HIDDEN_ON = ["/ask", "/assessment/questions"];

export function AskLauncher() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <Link
      href="/ask"
      aria-label="اسألني: مساعد المنصة"
      className="fixed bottom-5 end-4 z-40 inline-flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-brand-700 text-white shadow-lg ring-1 ring-brand-900/10 transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 sm:h-16 sm:w-auto sm:px-5"
    >
      <MessageCircleQuestion className="h-7 w-7 shrink-0" aria-hidden="true" />
      {/* الاسم يظهر على الشاشات الأوسع؛ على الجوال تبقى دائرة صغيرة لا تحجب أزرار الصفحة. */}
      <span className="hidden text-base font-bold sm:inline">اسألني</span>
    </Link>
  );
}
