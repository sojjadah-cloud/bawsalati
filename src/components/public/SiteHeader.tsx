"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Menu, X } from "lucide-react";
import { PartnersStrip } from "./PartnersStrip";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/assessment", label: "مقياس السمات والميول" },
  { href: "/library", label: "المكتبة الرقمية" },
  { href: "/booking", label: "حجز موعد" },
  { href: "/guide", label: "دليل الطالب" },
  { href: "/eligibility", label: "اعرف تخصصك" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <PartnersStrip />
      <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-white/95 backdrop-blur-sm">
        <div className="container-header">
          {/* الطرفان على حافتي الترويسة، واسم المنصة مثبّت في منتصفها تماماً
              مهما اختلف عرض الطرفين */}
          <div className="relative flex h-16 items-center justify-between gap-3">
            {/* اليمين: التنقّل على الشاشات الكبيرة، وزرّ القائمة على الجوال */}
            <div className="flex items-center">
              <nav aria-label="التنقّل الرئيسي" className="hidden xl:block xl:pl-6">
                <ul className="flex items-center gap-0.5">
                  {NAV.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        className={`inline-flex h-10 items-center rounded-[var(--radius-md)] px-2 text-[13px] font-bold whitespace-nowrap transition-colors 2xl:px-2.5 2xl:text-sm ${
                          isActive(item.href)
                            ? "bg-brand-50 text-brand-800"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-nav"
                aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-slate-700 transition-colors hover:bg-slate-100 xl:hidden"
              >
                {open ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* المنتصف: اسم المنصة */}
            <Link
              href="/"
              className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5 rounded-[var(--radius-md)] py-1 font-bold whitespace-nowrap text-slate-900"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-brand-700 text-white">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-lg">بوصلتي</span>
            </Link>

            {/* اليسار: دخول الأخصائيين. بابٌ للأخصائيين لا للطلبة، فيتميّز بلونه ويبقى هادئاً */}
            <div className="flex items-center">
              <Link
                href="/login"
                className="btn-sm hidden items-center rounded-[var(--radius-md)] border border-brand-200 bg-brand-50 px-3 font-bold text-brand-800 transition-colors hover:border-brand-300 hover:bg-brand-100 xl:inline-flex"
              >
                دخول الأخصائيين
              </Link>
            </div>
          </div>
        </div>

        {open ? (
          <nav
            id="mobile-nav"
            aria-label="التنقّل الرئيسي"
            className="animate-in border-t border-[var(--color-line)] bg-white xl:hidden"
          >
            <ul className="container-header flex flex-col py-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`flex min-h-12 items-center rounded-[var(--radius-md)] px-3 text-base font-bold ${
                      isActive(item.href)
                        ? "bg-brand-50 text-brand-800"
                        : "text-slate-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="mt-1 border-t border-[var(--color-line)] pt-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center rounded-[var(--radius-md)] px-3 text-base font-bold text-slate-500"
                >
                  دخول الأخصائيين
                </Link>
              </li>
            </ul>
          </nav>
        ) : null}
      </header>
    </>
  );
}
