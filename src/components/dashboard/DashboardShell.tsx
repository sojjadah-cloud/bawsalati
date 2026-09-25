"use client";

// هيكل لوحات العمل: شريط جانبي على الشاشات الكبيرة، وشريط سفلي على الجوال.
// الشريط السفلي نمط أصلي للجوال، لا شريطاً جانبياً مصغّراً.
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenText,
  CalendarDays,
  ClipboardList,
  Clock,
  Compass,
  FileText,
  FolderTree,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/client";
import { NotificationBell } from "./NotificationBell";
import { PartnersStrip } from "@/components/public/PartnersStrip";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** يظهر في الشريط السفلي على الجوال */
  primary?: boolean;
}

export type DashboardArea = "specialist" | "admin";

/**
 * قوائم التنقّل تعيش هنا لأن أيقونات lucide دوالّ،
 * والدوالّ لا تُمرَّر من مكوّن خادم إلى مكوّن عميل.
 */
const NAV: Record<DashboardArea, { label: string; items: NavItem[] }> = {
  specialist: {
    label: "لوحة الأخصائي",
    items: [
      { href: "/specialist", label: "الرئيسية", icon: LayoutDashboard, primary: true },
      { href: "/specialist/assessments", label: "نتائج الاختبارات", icon: ClipboardList, primary: true },
      { href: "/specialist/appointments", label: "الحجوزات", icon: CalendarDays, primary: true },
      { href: "/specialist/library", label: "المكتبة الرقمية", icon: BookOpenText, primary: true },
      { href: "/specialist/categories", label: "تصنيفات المكتبة", icon: FolderTree },
      { href: "/specialist/faq", label: "بنك أسئلة اسألني", icon: MessageSquare },
      { href: "/specialist/availability", label: "الأوقات المتاحة", icon: Clock },
      { href: "/specialist/profile", label: "الملف الشخصي", icon: UserRound },
    ],
  },
  admin: {
    label: "إدارة المنصة",
    items: [
      { href: "/admin", label: "الرئيسية", icon: LayoutDashboard, primary: true },
      { href: "/admin/specialists", label: "الأخصائيون", icon: Users, primary: true },
      { href: "/admin/questions", label: "أسئلة المقياس", icon: ListChecks, primary: true },
      { href: "/admin/topics", label: "مواضيع الاستشارة", icon: MessageSquare, primary: true },
      { href: "/admin/library", label: "تصنيفات المكتبة", icon: BookOpenText },
      { href: "/admin/guide", label: "دليل الطالب", icon: FileText },
      { href: "/admin/settings", label: "إعدادات المنصة", icon: Settings },
      { href: "/admin/audit", label: "سجل النظام", icon: ShieldCheck },
    ],
  },
};

export function DashboardShell({
  area,
  userName,
  userRole,
  children,
}: {
  area: DashboardArea;
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const { label: areaLabel, items } = NAV[area];
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string) =>
    href === items[0]?.href ? pathname === href : pathname.startsWith(href);

  const primary = items.filter((i) => i.primary).slice(0, 4);
  const secondary = items.filter((i) => !i.primary);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await api.post("/api/auth/logout");
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#dash-main" className="skip-link">
        تخطّي إلى المحتوى
      </a>

      {/* الشريط الجانبي — شاشات كبيرة */}
      <aside className="fixed inset-y-0 right-0 hidden w-64 flex-col border-l border-[var(--color-line)] bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-[var(--color-line)] px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-brand-700 text-white">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-900">بوصلتي</p>
            <p className="truncate text-[11px] text-[var(--color-faint)]">{areaLabel}</p>
          </div>
          {area === "specialist" ? <NotificationBell /> : null}
        </div>

        <nav aria-label={areaLabel} className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-bold transition-colors ${
                    isActive(item.href)
                      ? "bg-brand-50 text-brand-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-[var(--color-line)] p-3">
          <div className="px-3 pb-2">
            <p className="truncate text-sm font-bold text-slate-900">{userName}</p>
            <p className="text-xs text-[var(--color-faint)]">{userRole}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-danger-700 disabled:opacity-60"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* شريط الشعارات الرسمي، بإزاحة الشريط الجانبي على الشاشات الكبيرة */}
      <div className="lg:mr-64">
        <PartnersStrip />
      </div>

      {/* ترويسة الجوال */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--color-line)] bg-white px-4 lg:hidden">
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-brand-700 text-white">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-extrabold text-slate-900">{areaLabel}</span>
        </span>
        {area === "specialist" ? (
          <NotificationBell />
        ) : (
          <span className="truncate text-xs text-[var(--color-faint)]">{userName}</span>
        )}
      </header>

      <main id="dash-main" className="pb-24 lg:mr-64 lg:pb-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>

      {/* الشريط السفلي — الجوال */}
      <nav
        aria-label={areaLabel}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-line)] bg-white lg:hidden"
      >
        <ul className="flex">
          {primary.map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold ${
                  isActive(item.href) ? "text-brand-700" : "text-slate-500"
                }`}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-expanded={sheetOpen}
              className="flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold text-slate-500"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              المزيد
            </button>
          </li>
        </ul>
      </nav>

      {/* لوحة "المزيد" */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <div className="animate-in absolute inset-x-0 bottom-0 rounded-t-[var(--radius-xl)] bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">{userName}</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="إغلاق"
                className="cursor-pointer rounded p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {secondary.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSheetOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-bold text-slate-700"
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="border-t border-[var(--color-line)] pt-1">
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-bold text-danger-700"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                  تسجيل الخروج
                </button>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
