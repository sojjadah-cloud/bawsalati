import Link from "next/link";
import { Compass, Mail, MapPin, Phone } from "lucide-react";
import { BRAND } from "@/lib/constants";

const SERVICES = [
  { href: "/assessment", label: "اختبار بوصلتي" },
  { href: "/library", label: "المكتبة الرقمية" },
  { href: "/booking", label: "حجز موعد" },
  { href: "/guide", label: "دليل الطالب" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--color-line)] bg-white">
      <div className="container-x py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-brand-700 text-white">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-extrabold text-slate-900">{BRAND.name}</span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-muted)]">
              {BRAND.description}
            </p>
          </div>

          <nav aria-labelledby="footer-services">
            <h2 id="footer-services" className="text-sm font-bold text-slate-900">
              الخدمات
            </h2>
            <ul className="mt-4 space-y-2.5">
              {SERVICES.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="text-sm text-[var(--color-muted)] transition-colors hover:text-brand-700"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-sm font-bold text-slate-900">التواصل</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-[var(--color-muted)]">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <a href={`mailto:${BRAND.email}`} className="transition-colors hover:text-brand-700">
                  {BRAND.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span dir="ltr">{BRAND.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{BRAND.location}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--color-line)] pt-6 text-xs text-[var(--color-faint)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {BRAND.name}. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4">
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
