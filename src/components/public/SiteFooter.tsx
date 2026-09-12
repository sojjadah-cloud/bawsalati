import Link from "next/link";
import { Compass, Mail, MapPin, Phone } from "lucide-react";
import { BRAND } from "@/lib/constants";

const SERVICES = [
  { href: "/assessment", label: "اختبار بوصلتي" },
  { href: "/library", label: "المكتبة الرقمية" },
  { href: "/programs", label: "دليل التخصصات" },
  { href: "/booking", label: "حجز موعد" },
  { href: "/guide", label: "دليل الطالب" },
];

/**
 * تذييل أفقي مضغوط.
 * الروابط وبيانات التواصل تُرصّ عرضاً وتلتفّ عند الحاجة، فلا يطول التذييل
 * على الشاشات الصغيرة. العناوين مُعلَنة عبر aria بدل سطر مرئي لكل قسم.
 */
export function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-[var(--color-line)] bg-white">
      {/* مساحة سفلية إضافية كي لا تغطّي أيقونة جويب العائمة آخر سطر في التذييل. */}
      <div className="container-x pt-7 pb-24">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-brand-700 text-white">
              <Compass className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-extrabold text-slate-900">{BRAND.name}</span>
          </Link>

          <nav aria-label="الخدمات">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {SERVICES.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="text-[var(--color-muted)] transition-colors hover:text-brand-700"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <ul
            aria-label="بيانات التواصل"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--color-muted)]"
          >
            <li className="flex items-center gap-1.5">
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              <a href={`mailto:${BRAND.email}`} className="transition-colors hover:text-brand-700">
                {BRAND.email}
              </a>
            </li>
            <li className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span dir="ltr">{BRAND.phone}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{BRAND.location}</span>
            </li>
          </ul>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-faint)]">
          <p>© {new Date().getFullYear()} {BRAND.name}</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="transition-colors hover:text-brand-700">
              الخصوصية
            </Link>
            <Link href="/login" className="transition-colors hover:text-brand-700">
              دخول المختصين
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
