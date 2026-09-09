import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { Alert, PageHeading } from "@/components/ui/primitives";
import { QuestionEditor } from "@/components/admin/QuestionEditor";

export const metadata: Metadata = {
  title: "أسئلة المقياس",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  await requireAdmin();

  const assessment = await prisma.assessment.findFirst({
    where: { active: true },
    select: {
      title: true,
      version: true,
      groupCount: true,
      questionsPerGroup: true,
      groups: {
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          number: true,
          title: true,
          questions: {
            orderBy: { displayOrder: "asc" },
            select: {
              id: true,
              number: true,
              text: true,
              active: true,
              dimension: { select: { code: true, label: true } },
            },
          },
        },
      },
    },
  });

  if (!assessment) {
    return (
      <>
        <PageHeading title="أسئلة المقياس" />
        <div className="mt-6">
          <Alert tone="warning" title="لا يوجد مقياس فعّال">
            شغّل تهيئة قاعدة البيانات (npm run seed) لإنشاء المقياس وأسئلته.
          </Alert>
        </div>
      </>
    );
  }

  const totalActive = assessment.groups.reduce(
    (n, g) => n + g.questions.filter((q) => q.active).length,
    0
  );

  return (
    <>
      <PageHeading
        title="أسئلة المقياس"
        description={`${assessment.title} — ${assessment.groupCount} مجموعات × ${assessment.questionsPerGroup} عبارات.`}
      />

      <div className="mt-5">
        <Alert tone="info" title="ما الذي يمكن تعديله هنا">
          يمكنك تحرير نص العبارة أو تعطيلها. المحور والترتيب جزء من بنية المقياس المرتبطة
          بنتائج سابقة، فلا يُعدّلان من هنا. العبارات الفعّالة الآن: {totalActive}.
        </Alert>
      </div>

      <div className="mt-6 space-y-6">
        {assessment.groups.map((g) => (
          <section key={g.id} className="card" aria-labelledby={`group-${g.number}`}>
            <h2
              id={`group-${g.number}`}
              className="border-b border-[var(--color-line)] px-5 py-3 text-sm font-bold text-slate-900"
            >
              {g.title}
              <span className="mr-2 font-normal text-[var(--color-muted)]">
                ({g.questions.length} عبارات)
              </span>
            </h2>
            <ul className="divide-y divide-[var(--color-line)]">
              {g.questions.map((q) => (
                <li key={q.id} className="px-5 py-3">
                  <div className="mb-1 flex items-center gap-2 text-xs text-[var(--color-faint)]">
                    <span className="tabular-nums">العبارة {q.number}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.dimension.label}</span>
                  </div>
                  <QuestionEditor
                    questionId={q.id}
                    number={q.number}
                    text={q.text}
                    active={q.active}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
