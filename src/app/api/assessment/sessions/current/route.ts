import { noStore, errorResponse, ApiError } from "@/lib/api";
import { getAttemptToken } from "@/lib/attempt";
import { getActiveAssessment, getSessionByToken, getProgress } from "@/features/assessment/service";

/** حالة الجلسة الحالية + الأسئلة + الإجابات المحفوظة. */
export async function GET() {
  try {
    const token = await getAttemptToken();
    if (!token) throw new ApiError("لا توجد جلسة اختبار مفتوحة", 404);

    const session = await getSessionByToken(token);
    if (!session) throw new ApiError("انتهت صلاحية الجلسة — ابدأ الاختبار من جديد", 404);

    const assessment = await getActiveAssessment();
    const answers = await getProgress(session.id);

    return noStore({
      session: {
        status: session.status,
        studentName: session.studentName,
        grade: session.grade,
        startedAt: session.startedAt,
      },
      assessment: {
        title: assessment.title,
        groupCount: assessment.groupCount,
        questionsPerGroup: assessment.questionsPerGroup,
        totalQuestions: assessment.groups.reduce((n, g) => n + g.questions.length, 0),
        options: assessment.options.map((o) => ({ value: o.value, label: o.label })),
        groups: assessment.groups.map((g) => ({
          number: g.number,
          title: g.title,
          questions: g.questions.map((q) => ({ id: q.id, number: q.number, text: q.text })),
        })),
      },
      answers: Object.fromEntries(answers.map((a) => [a.questionId, a.value])),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
