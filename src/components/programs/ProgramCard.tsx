import Link from "next/link";
import { ArrowLeft, Building2, MapPin } from "lucide-react";
import type { ProgramCard as Program } from "@/features/programs/service";

/** بطاقة برنامج: الرمز أولاً لأنه المفتاح الذي يتعامل به نظام القبول. */
export function ProgramCard({ program }: { program: Program }) {
  return (
    <li className="card card-pad flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-[var(--radius-sm)] bg-brand-700 px-2 py-0.5 font-mono text-sm font-bold tracking-wide text-white">
          {program.code}
        </span>
        <span className="badge-neutral">{program.programType}</span>
        {/* فئة الاستحقاق تُعرض حين تضيف معلومة: لا تكرّر النوع ولا تذكر العموم */}
        {program.eligibility &&
        program.eligibility !== "جميع الطلبة" &&
        program.eligibility !== program.programType ? (
          <span className="badge-info">{program.eligibility}</span>
        ) : null}
      </div>

      <h3 className="mt-3 text-base leading-relaxed font-bold text-slate-900">{program.name}</h3>

      <dl className="mt-3 space-y-1.5 text-sm text-[var(--color-muted)]">
        <div className="flex items-start gap-2">
          <dt className="sr-only">المجال الأكاديمي</dt>
          <dd>{program.field}</dd>
        </div>
        {program.institution ? (
          <div className="flex items-start gap-2">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">المؤسسة التعليمية</dt>
            <dd>{program.institution}</dd>
          </div>
        ) : null}
        {program.country ? (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">بلد الدراسة</dt>
            <dd>{program.country}</dd>
          </div>
        ) : null}
      </dl>

      <Link href={`/programs/${program.code}`} className="btn-outline btn-sm mt-4 self-start">
        عرض تفاصيل البرنامج
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </Link>
    </li>
  );
}
