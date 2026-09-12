import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  ListChecks,
} from "lucide-react";
import { HeroBackdrop } from "@/components/public/HeroBackdrop";

export const dynamic = "force-static";

const SERVICES = [
  {
    href: "/assessment",
    icon: ClipboardList,
    title: "اختبار بوصلتي",
    description: "54 عبارة تكشف ميولك المهنية والمجالات الأقرب إليك.",
    cta: "ابدأ الاختبار",
  },
  {
    href: "/library",
    icon: BookOpenText,
    title: "المكتبة الرقمية",
    description: "كتب مقروءة ومسموعة في التوجيه المهني وتنمية المهارات.",
    cta: "استكشف المكتبة",
  },
  {
    href: "/booking",
    icon: CalendarCheck,
    title: "حجز موعد",
    description: "استشارة فردية مع مختص التوجيه المهني في وقت يناسبك.",
    cta: "احجز موعداً",
  },
  {
    href: "/guide",
    icon: GraduationCap,
    title: "دليل الطالب",
    description: "تصفّح التخصصات حسب المجال والمؤسسة، أو ابحث برمز البرنامج.",
    cta: "تصفّح التخصصات",
  },
  {
    href: "/eligibility",
    icon: ListChecks,
    title: "أي تخصص أستطيع دخوله؟",
    description: "أدخل صفّك وموادك ودرجاتك لتعرف ما تنطبق عليك شروطه.",
    cta: "اعرف تخصصاتك",
  },
];

export default function HomePage() {
  return (
    <>
      {/* قسم تعريفي — بلا أزرار. المداخل الفعلية في بطاقات الخدمات تحته. */}
      <section className="relative isolate overflow-hidden bg-brand-800 text-white">
        <HeroBackdrop />

        <div className="container-x relative py-20 text-center sm:py-28">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-3xl leading-tight font-bold text-balance text-white sm:text-4xl lg:text-5xl">
              اعرف ميولك، واختر تخصصك عن وعي
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-brand-100 sm:text-lg">
              بوصلتي منصة التوجيه المهني في المدرسة. تساعدك على فهم ميولك، وتضع
              بين يديك المراجع والدليل الرسمي ومختصاً تناقشه.
            </p>
          </div>
        </div>
      </section>

      {/* الخدمات الأربع */}
      <section className="container-x py-14">
        <h2 className="sr-only">خدمات بوصلتي</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="card card-interactive group flex h-full flex-col p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-brand-50 text-brand-700">
                  <s.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
                  {s.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700">
                  {s.cta}
                  <ArrowLeft
                    className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
