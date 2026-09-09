import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  CalendarCheck,
  ClipboardList,
  FileText,
  Headphones,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SERVICES = [
  {
    href: "/assessment",
    icon: ClipboardList,
    title: "اختبار بوصلتي",
    description:
      "أربع وخمسون عبارة تكشف ميولك المهنية وتُظهر المجالات الأقرب إلى شخصيتك.",
    cta: "ابدأ الاختبار",
  },
  {
    href: "/library",
    icon: BookOpenText,
    title: "المكتبة الرقمية",
    description:
      "كتب مقروءة ومسموعة في التوجيه المهني وتنمية المهارات والعلوم، متاحة لك مباشرة.",
    cta: "استكشف المكتبة",
  },
  {
    href: "/booking",
    icon: CalendarCheck,
    title: "حجز موعد",
    description:
      "احجز استشارة فردية مع مختص التوجيه المهني في وقت يناسبك من الأوقات المتاحة.",
    cta: "احجز موعداً",
  },
  {
    href: "/guide",
    icon: FileText,
    title: "دليل الطالب",
    description:
      "الدليل الرسمي للتخصصات والبرامج الدراسية وشروط القبول، بصيغة سهلة القراءة.",
    cta: "اقرأ الدليل",
  },
];

const STEPS = [
  {
    icon: ClipboardList,
    title: "أجب على الاختبار",
    text: "أربع وخمسون عبارة في تسع مجموعات. تستغرق نحو عشر دقائق، وإجاباتك تُحفظ أولاً بأول.",
  },
  {
    icon: UserCheck,
    title: "اطّلع على نتيجتك",
    text: "ستة جداول لمحاور الميول، يليها جدول تحليل يرتّب محاورك من الأقوى إلى الأقل.",
  },
  {
    icon: CalendarCheck,
    title: "ناقشها مع مختص",
    text: "احجز موعداً لمناقشة نتيجتك واختيار التخصص المناسب لك مع مختص التوجيه المهني.",
  },
];

async function getCounts() {
  const [resources, programs] = await Promise.all([
    prisma.libraryResource.count({ where: { published: true, archivedAt: null } }),
    prisma.program.count(),
  ]);
  return { resources, programs };
}

export default async function HomePage() {
  const counts = await getCounts();

  return (
    <>
      {/* ── الواجهة ── */}
      <section className="border-b border-[var(--color-line)] bg-white">
        <div className="container-x py-14 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="section-kicker">منصة التوجيه المهني</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                اعرف ميولك، واختر تخصصك عن وعي
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
                بوصلتي منصة تساعدك على اكتشاف ميولك المهنية عبر اختبار مقنّن، ثم
                تضع بين يديك مكتبة رقمية ودليل الطالب وموعداً مع مختص التوجيه
                المهني لمناقشة خطوتك التالية.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/assessment" className="btn-primary btn-lg">
                  ابدأ الاختبار
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link href="/booking" className="btn-outline btn-lg">
                  احجز موعداً
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--color-muted)]">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  بياناتك محفوظة ولا تُنشر
                </span>
                <span className="inline-flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  كتب مقروءة ومسموعة
                </span>
              </div>
            </div>

            {/* بطاقة موجزة — أرقام فعلية من قاعدة البيانات */}
            <div className="card card-pad">
              <h2 className="text-base font-bold text-slate-900">ما الذي تجده هنا</h2>
              <dl className="mt-5 space-y-4">
                {[
                  { label: "عبارة في اختبار الميول", value: "٥٤" },
                  { label: "محاور تُبنى عليها نتيجتك", value: "٦" },
                  { label: "برنامجاً دراسياً في الدليل", value: String(counts.programs) },
                  { label: "مورداً في المكتبة الرقمية", value: String(counts.resources) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-baseline justify-between gap-4 border-b border-[var(--color-line)] pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-sm text-[var(--color-muted)]">{item.label}</dt>
                    <dd className="text-2xl font-extrabold tabular-nums text-brand-800">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ── الخدمات الأربع ── */}
      <section className="container-x py-14 sm:py-16">
        <h2 className="section-title">خدمات بوصلتي</h2>
        <p className="section-lead">
          أربع خدمات تكمل بعضها، ابدأ من أيّها شئت.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
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

      {/* ── كيف تعمل ── */}
      <section className="border-y border-[var(--color-line)] bg-white">
        <div className="container-x py-14 sm:py-16">
          <h2 className="section-title">كيف تعمل بوصلتي</h2>
          <p className="section-lead">ثلاث خطوات من الاختبار إلى قرار واضح.</p>

          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-extrabold text-white">
                    {i + 1}
                  </span>
                  <step.icon className="h-5 w-5 text-brand-700" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── دعوة ختامية ── */}
      <section className="container-x py-14 sm:py-16">
        <div className="card flex flex-col items-start gap-5 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              جاهز لتبدأ؟
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--color-muted)]">
              الاختبار مجاني ولا يحتاج حساباً. تستغرق الإجابة نحو عشر دقائق،
              وتحصل على نتيجتك مباشرة.
            </p>
          </div>
          <Link href="/assessment" className="btn-primary btn-lg shrink-0">
            ابدأ الاختبار
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
