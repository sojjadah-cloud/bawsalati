import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenText,
  CalendarDays,
  ClipboardList,
  FileText,
  ListChecks,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { Alert, PageHeading, StatCard } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "إدارة المنصة",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await requireAdmin();

  const activeAssessment = await prisma.assessment.findFirst({
    where: { active: true },
    select: { id: true, title: true },
  });

  const [
    specialists,
    activeQuestions,
    topics,
    resources,
    submissions,
    appointments,
    activeRuleSet,
    guide,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "SPECIALIST", active: true } }),
    activeAssessment
      ? prisma.assessmentQuestion.count({
          where: { active: true, assessmentId: activeAssessment.id },
        })
      : Promise.resolve(0),
    prisma.consultationTopic.count({ where: { active: true } }),
    prisma.libraryResource.count({ where: { published: true, archivedAt: null } }),
    prisma.assessmentSession.count({ where: { status: "SUBMITTED" } }),
    prisma.appointment.count(),
    prisma.scoringRuleSet.findFirst({
      where: { active: true, assessmentId: activeAssessment?.id },
      select: {
        version: true,
        method: true,
        provisional: true,
        _count: { select: { rules: true } },
      },
    }),
    prisma.guideDocument.findFirst({ where: { published: true }, select: { version: true } }),
  ]);

  const warnings: string[] = [];
  if (specialists === 0) warnings.push("لا يوجد أخصائي فعّال — لن يتمكّن الطلاب من حجز موعد.");
  if (!activeAssessment) warnings.push("لا يوجد مقياس فعّال — شغّل تهيئة قاعدة البيانات.");
  if (!activeRuleSet || activeRuleSet._count.rules === 0) {
    warnings.push(
      "لم تُدخل جداول التحويل بعد. لن تُحتسب أي نتيجة قبل استيرادها بالأمر npm run norms:import."
    );
  } else if (activeRuleSet.provisional) {
    warnings.push(
      "جدول التحويل الفعّال مؤقّت وليس الجدول المعياري الرسمي. الرتب المئينية غير معتمدة، وتظهر تحذيرات على كل نتيجة."
    );
  }
  if (activeQuestions !== 54) {
    warnings.push(`عدد عبارات المقياس الفعّال ${activeQuestions} بدل 54 — راجع أسئلة المقياس.`);
  }
  if (!guide) warnings.push("لم يُنشر دليل الطالب بعد.");

  return (
    <>
      <PageHeading
        title={`أهلاً، ${session.name}`}
        description="حالة المنصة وإعداداتها الأساسية."
      />

      {warnings.length > 0 ? (
        <div className="mt-5">
          <Alert tone="warning" title="أمور تحتاج انتباهك">
            <ul className="mt-1 list-disc space-y-1 pr-5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Alert>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="أخصائيون فعّالون" value={specialists} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="عبارات المقياس"
          value={activeQuestions}
          hint={activeRuleSet ? `قواعد التصحيح v${activeRuleSet.version}` : "لا توجد قواعد فعّالة"}
          icon={<ListChecks className="h-5 w-5" />}
        />
        <StatCard label="مواضيع الاستشارة" value={topics} icon={<FileText className="h-5 w-5" />} />
        <StatCard
          label="موارد منشورة"
          value={resources}
          icon={<BookOpenText className="h-5 w-5" />}
        />
        <StatCard
          label="اختبارات مكتملة"
          value={submissions}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard label="حجوزات" value={appointments} icon={<CalendarDays className="h-5 w-5" />} />
      </div>

      <section className="mt-8" aria-labelledby="quick-links">
        <h2 id="quick-links" className="text-base font-bold text-slate-900">
          إجراءات سريعة
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            { href: "/admin/specialists", label: "إدارة الأخصائيين", icon: Users },
            { href: "/admin/questions", label: "مراجعة أسئلة المقياس", icon: ListChecks },
            { href: "/admin/topics", label: "مواضيع الاستشارة", icon: FileText },
            { href: "/admin/guide", label: "نشر دليل الطالب", icon: BookOpenText },
          ].map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="card card-interactive flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-slate-800"
              >
                <l.icon className="h-5 w-5 text-brand-700" aria-hidden="true" />
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {activeRuleSet ? (
        <section className="mt-8" aria-labelledby="scoring">
          <h2 id="scoring" className="text-base font-bold text-slate-900">
            قواعد التصحيح
          </h2>
          <div className="card card-pad mt-3 text-sm">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-[var(--color-muted)]">الإصدار الفعّال</dt>
                <dd className="mt-0.5 font-bold text-slate-900">
                  v{activeRuleSet.version}
                  {activeRuleSet.provisional ? " — مؤقّت" : " — رسمي"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-muted)]">طريقة الحساب</dt>
                <dd className="mt-0.5 font-bold text-slate-900" dir="ltr">
                  {activeRuleSet.method}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-muted)]">عدد القواعد</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-slate-900">
                  {activeRuleSet._count.rules}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">
              القواعد مخزّنة في قاعدة البيانات ومربوطة بإصدارها. النتائج السابقة تبقى مرتبطة
              بالإصدار الذي حُسبت به، فإدخال إصدار جديد لا يغيّر نتيجة طالب سابق.
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
