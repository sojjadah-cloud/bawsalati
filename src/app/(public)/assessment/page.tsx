import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/primitives";
import { StartAssessmentForm } from "@/components/assessment/StartAssessmentForm";
import { PageHero } from "@/components/public/PageHero";

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

  const paragraphs = assessment.introduction.split("\n\n").filter(Boolean);

  return (
    <>
      <PageHero
        title={assessment.title}
        description="اقرأ المقدّمة، ثم أدخل بياناتك وابدأ."
      />

      <div className="container-narrow py-10 sm:py-14">
        <div className="prose-ar text-base">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-10">
          <StartAssessmentForm />
        </div>
      </div>
    </>
  );
}
