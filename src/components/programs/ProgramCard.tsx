import Link from "next/link";
import { ArrowLeft, MapPin, Layers } from "lucide-react";
import type { ProgramCard as Program } from "@/features/programs/service";

/** مكان الدراسة: المؤسسة والبلد معاً، وما توفّر منهما إن نقص أحدهما. */
export function placeOfStudy(program: {
  institution: string;
  country: string;
}): string {
  return [program.institution, program.country].filter(Boolean).join(" — ");
}

/**
 * بطاقة البرنامج في نتائج التصفّح: الرمز، واسم التخصص، والمجال، ومكان الدراسة.
 * التفاصيل كلها في صفحة البرنامج، فتبقى البطاقة خفيفة تُقرأ بنظرة.
 */
export function ProgramCard({ program }: { program: Program }) {
  const place = placeOfStudy(program);

  return (
    <li className="card card-pad relative flex flex-col transition-shadow focus-within:ring-2 focus-within:ring-brand-600 hover:shadow-md">
      <span className="self-start rounded-[var(--radius-sm)] bg-brand-700 px-2 py-0.5 font-mono text-sm font-bold tracking-wide text-white">
        {program.code}
      </span>

      {/* البطاقة كلها مدخل واحد إلى صفحة البرنامج: الرابط يغطّيها بالكامل */}
      {/* بعض أسماء الدليل فقرةٌ كاملة، فتُقصّ هنا وتُقرأ كاملةً في صفحة البرنامج */}
      <h3 className="mt-3 text-base leading-relaxed font-bold text-slate-900">
        <Link
          href={`/programs/${program.code}`}
          title={program.name}
          className="line-clamp-3 after:absolute after:inset-0"
        >
          {program.name}
        </Link>
      </h3>

      <dl className="mt-3 space-y-1.5 text-sm text-[var(--color-muted)]">
        <div className="flex items-start gap-2">
          <Layers className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <dt className="sr-only">المجال الأكاديمي</dt>
          <dd>{program.field}</dd>
        </div>
        {place ? (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">مكان الدراسة</dt>
            <dd>{place}</dd>
          </div>
        ) : null}
      </dl>

      <span className="btn-outline btn-sm mt-4 self-start" aria-hidden="true">
        عرض تفاصيل البرنامج
        <ArrowLeft className="h-4 w-4" />
      </span>
    </li>
  );
}
