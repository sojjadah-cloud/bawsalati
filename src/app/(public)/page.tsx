import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  CalendarCheck,
  ClipboardList,
  FileText,
} from "lucide-react";

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
    icon: FileText,
    title: "دليل الطالب",
    description: "التخصصات والبرامج الدراسية وشروط القبول.",
    cta: "اقرأ الدليل",
  },
];

const STEPS = [
  { n: "1", title: "أجب على الاختبار", text: "عشر دقائق، وإجاباتك تُحفظ أولاً بأول." },
  { n: "2", title: "اطّلع على نتيجتك", text: "ستة جداول لمحاور ميولك، يليها جدول تحليل." },
  { n: "3", title: "ناقشها مع مختص", text: "احجز موعداً لاختيار التخصص المناسب لك." },
];

export default function HomePage() {
  return (
    <>
      {/* الواجهة */}
      <section className="border-b border-[var(--color-line)] bg-white">
        <div className="container-x py-16 sm:py-24">
          {/* الواجهة موسّطة؛ بقية الأقسام تبقى بمحاذاة النص الطبيعية للقراءة */}
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-4xl lg:text-5xl">
              اعرف ميولك، واختر تخصصك عن وعي
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-[var(--color-muted)] sm:text-lg">
              منصة التوجيه المهني لطلاب المدرسة: اختبار ميول، مكتبة رقمية، دليل
              الطالب، وموعد مع مختص.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/assessment" className="btn-primary btn-lg">
                ابدأ الاختبار
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link href="/booking" className="btn-outline btn-lg">
                احجز موعداً
              </Link>
            </div>
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

      {/* ثلاث خطوات */}
      <section className="border-t border-[var(--color-line)] bg-white">
        <div className="container-x py-12">
          <h2 className="text-lg font-bold text-slate-900">كيف تعمل بوصلتي</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-extrabold text-white">
                  {step.n}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{step.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-[var(--color-muted)]">
                    {step.text}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
