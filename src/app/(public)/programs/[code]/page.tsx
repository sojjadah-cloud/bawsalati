import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, ChevronLeft, FileText } from "lucide-react";
import { getProgramByCode, relatedPrograms } from "@/features/programs/service";
import { HeroBreadcrumb, PageHero } from "@/components/public/PageHero";
import { ProgramCard } from "@/components/programs/ProgramCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const program = await getProgramByCode(decodeURIComponent(code));
  if (!program) return { title: "البرنامج غير موجود" };
  return {
    title: `${program.code} — ${program.name}`,
    description: `${program.field} · ${program.programType}${
      program.institution ? ` · ${program.institution}` : ""
    }`,
  };
}

/** نصّ الدليل يأتي أسطراً، فيُعرض أسطراً بدل فقرة واحدة ملتصقة. */
function Lines({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  return (
    <ul className="space-y-1.5 text-sm leading-relaxed text-slate-700">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--color-line)] py-2 last:border-0">
      <dt className="shrink-0 text-[var(--color-muted)]">{label}</dt>
      <dd className="text-left font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const program = await getProgramByCode(decodeURIComponent(code));
  if (!program) notFound();

  const related = await relatedPrograms(program.code, program.field, program.programType);

  return (
    <>
      <PageHero
        title={program.name}
        description={`رمز البرنامج ${program.code}`}
        breadcrumb={
          <HeroBreadcrumb>
            <li>
              <Link href="/guide" className="transition-colors hover:text-white">
                دليل الطالب
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronLeft className="h-4 w-4" />
            </li>
            <li>
              <Link
                href={`/guide?field=${encodeURIComponent(program.field)}`}
                className="transition-colors hover:text-white"
              >
                {program.field}
              </Link>
            </li>
          </HeroBreadcrumb>
        }
      />

      <div className="container-x py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-6">
            {program.requirements ? (
              <section className="card card-pad">
                <h2 className="text-base font-bold text-slate-900">الحد الأدنى للتقدم والشروط</h2>
                <div className="mt-3">
                  <Lines text={program.requirements} />
                </div>
              </section>
            ) : null}

            {program.tieBreakers ? (
              <section className="card card-pad">
                <h2 className="text-base font-bold text-slate-900">مواد المفاضلة وحسم التعادل</h2>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  تُستخدم عند تساوي المعدّل التنافسي بين المتقدّمين.
                </p>
                <div className="mt-3">
                  <Lines text={program.tieBreakers} />
                </div>
              </section>
            ) : null}

            {program.notes ? (
              <section className="card card-pad">
                <h2 className="text-base font-bold text-slate-900">ملاحظات وشروط إضافية</h2>
                <div className="mt-3">
                  <Lines text={program.notes} />
                </div>
              </section>
            ) : null}

            <section className="card card-pad bg-slate-50">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <FileText className="h-5 w-5 text-brand-700" aria-hidden="true" />
                تحقّق من المصدر
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {program.guidePage
                  ? `هذا البرنامج مذكور في صفحة ${program.guidePage} من دليل الطالب.`
                  : "هذا البرنامج مأخوذ من دليل الطالب."}{" "}
                الشروط والمواعيد تتغيّر سنوياً، فافتح الدليل وتأكّد قبل التقديم.
              </p>
              <Link href="/guide" className="btn-outline btn-sm mt-4">
                افتح الدليل الرسمي
              </Link>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="card card-pad">
              <h2 className="text-sm font-bold text-slate-900">بيانات البرنامج</h2>
              <dl className="mt-3 text-sm">
                <Detail label="رمز البرنامج" value={program.code} />
                <Detail label="المجال الأكاديمي" value={program.field} />
                <Detail label="نوع البرنامج" value={program.programType} />
                <Detail label="فئة الاستحقاق" value={program.eligibility} />
                <Detail label="المؤسسة التعليمية" value={program.institution} />
                <Detail label="بلد الدراسة" value={program.country} />
                <Detail label="لغة الدراسة" value={program.language} />
                <Detail label="المؤهل" value={program.qualification} />
                <Detail
                  label="صفحة الدليل"
                  value={program.guidePage ? String(program.guidePage) : ""}
                />
              </dl>
            </div>

            <div className="card card-pad">
              <h2 className="text-sm font-bold text-slate-900">تحتاج رأياً؟</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                ناقش هذا البرنامج مع مختص التوجيه المهني قبل أن ترتّب رغباتك.
              </p>
              <Link href="/booking" className="btn-primary btn-block mt-4">
                <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                احجز موعداً
              </Link>
            </div>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-center text-xl font-bold text-slate-900">برامج قريبة</h2>
            <p className="mt-2 text-center text-sm text-[var(--color-muted)]">
              {program.field} · {program.programType}
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProgramCard key={p.id} program={p} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
