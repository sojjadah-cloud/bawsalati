import type { Metadata } from "next";
import { Clock, ListChecks, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/primitives";
import { StartAssessmentForm } from "@/components/assessment/StartAssessmentForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "اختبار بوصلتي",
  description:
    "اختبار ميول مهنية من 54 عبارة يساعدك على التعرّف على المجالات الأقرب إلى شخصيتك واهتماماتك.",
};

async function getIntro() {
  const assessment = await prisma.assessment.findFirst({
    where: { active: true },
    select: {
      title: true,
      introduction: true,
      groupCount: true,
      questionsPerGroup: true,
      _count: { select: { questions: { where: { active: true } } } },
    },
  });
  return assessment;
}

export default async function AssessmentIntroPage() {
  const assessment = await getIntro();

  if (!assessment) {
    return (
      <div className="container-narrow py-16">
        <Alert tone="warning" title="الاختبار غير متاح حالياً">
          لم يُفعّل أي مقياس بعد. يرجى المحاولة لاحقاً أو التواصل مع مختص التوجيه المهني.
        </Alert>
      </div>
    );
  }

  const total = assessment._count.questions;
  const paragraphs = assessment.introduction.split("\n\n").filter(Boolean);

  return (
    <div className="container-narrow py-10 sm:py-14">
      <p className="section-kicker">قبل أن تبدأ</p>
      <h1 className="section-title">{assessment.title}</h1>

      <div className="prose-ar mt-6 text-base">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { icon: ListChecks, label: `${total} عبارة`, sub: `${assessment.groupCount} مجموعات` },
          { icon: Clock, label: "نحو 10 دقائق", sub: "يمكنك العودة والتعديل" },
          { icon: ShieldCheck, label: "نتيجتك خاصة", sub: "لا تُنشر ولا تُشارك" },
        ].map((item) => (
          <li key={item.label} className="card flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-brand-50 text-brand-700">
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-900">{item.label}</span>
              <span className="block text-xs text-[var(--color-muted)]">{item.sub}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <StartAssessmentForm />
      </div>
    </div>
  );
}
