"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Menu, X } from "lucide-react";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/assessment", label: "اختبار بوصلتي" },
  { href: "/library", label: "المكتبة الرقمية" },
  { href: "/booking", label: "حجز موعد" },
  { href: "/guide", label: "دليل الطالب" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-white/95 backdrop-blur-sm">
      <div className="container-x">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-[var(--radius-md)] py-1 font-extrabold text-slate-900"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-brand-700 text-white">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg">بوصلتي</span>
          </Link>

          <nav aria-label="التنقّل الرئيسي" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`inline-flex h-10 items-center rounded-[var(--radius-md)] px-3.5 text-sm font-bold transition-colors ${
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

          <div className="hidden lg:block">
            <Link href="/login" className="btn-ghost btn-sm">
              دخول المختصين
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
          >
            {open ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="التنقّل الرئيسي"
          className="animate-in border-t border-[var(--color-line)] bg-white lg:hidden"
        >
          <ul className="container-x flex flex-col py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex min-h-12 items-center rounded-[var(--radius-md)] px-3 text-base font-bold ${
                    isActive(item.href) ? "bg-brand-50 text-brand-800" : "text-slate-700"
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
                دخول المختصين
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
