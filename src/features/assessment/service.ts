// خدمة المقياس: إنشاء الجلسة، حفظ الإجابات، الإرسال، بناء النتيجة.
// كل ما يتعلق بالتصحيح يجري هنا في الخادم.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { generateAccessToken, hashToken } from "@/lib/tokens";
import { RESULT_TOKEN_DAYS } from "@/lib/constants";
import {
  scoreAssessment,
  gradeBandOf,
  ScoringError,
  type ResultSection,
  type AnalysisRow,
} from "./scoring";
import type { StartSessionInput } from "./schemas";

/** المقياس الفعّال مع مجموعاته وأسئلته وخياراته. */
export async function getActiveAssessment() {
  const assessment = await prisma.assessment.findFirst({
    where: { active: true },
    include: {
      options: { orderBy: { displayOrder: "asc" } },
      dimensions: { orderBy: { displayOrder: "asc" } },
      groups: {
        orderBy: { displayOrder: "asc" },
        include: {
          questions: {
            where: { active: true },
            orderBy: { displayOrder: "asc" },
            select: { id: true, number: true, text: true, displayOrder: true },
          },
        },
      },
    },
  });
  if (!assessment) throw new ApiError("المقياس غير متاح حالياً", 503);
  return assessment;
}

/** مجموعة القواعد الفعّالة للمقياس. */
async function getActiveRuleSet(assessmentId: string) {
  const ruleSet = await prisma.scoringRuleSet.findFirst({
    where: { assessmentId, active: true },
    orderBy: { version: "desc" },
    include: { rules: true },
  });
  if (!ruleSet) {
    throw new ApiError("لم تُضبط قواعد التصحيح بعد — راجع مدير النظام", 503);
  }
  return ruleSet;
}

export interface StartedSession {
  sessionId: string;
  token: string;
}

export async function startSession(input: StartSessionInput): Promise<StartedSession> {
  const assessment = await getActiveAssessment();
  const token = generateAccessToken();
  const expires = new Date();
  expires.setDate(expires.getDate() + RESULT_TOKEN_DAYS);

  const session = await prisma.assessmentSession.create({
    data: {
      assessmentId: assessment.id,
      studentName: input.studentName,
      grade: input.grade,
      gender: input.gender as "MALE" | "FEMALE",
      phone: input.phone,
      tokenHash: hashToken(token),
      tokenExpires: expires,
    },
    select: { id: true },
  });

  return { sessionId: session.id, token };
}

/** جلسة الطالب مقابل رمزه — المصدر الوحيد للتحقق من ملكية الجلسة. */
export async function getSessionByToken(token: string) {
  if (!token) return null;
  const session = await prisma.assessmentSession.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!session) return null;
  if (session.tokenExpires < new Date()) return null;
  return session;
}

export async function requireOpenSession(token: string) {
  const session = await getSessionByToken(token);
  if (!session) throw new ApiError("الجلسة غير موجودة أو انتهت صلاحيتها", 404);
  if (session.status === "SUBMITTED") {
    throw new ApiError("تم إرسال هذا الاختبار مسبقاً", 409);
  }
  return session;
}

/** حفظ تدريجي — يُستدعى بعد كل إجابة، فلا تضيع الإجابات عند انقطاع الاتصال. */
export async function saveAnswers(
  sessionId: string,
  answers: { questionId: string; value: number }[]
) {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    select: { assessmentId: true, status: true },
  });
  if (!session) throw new ApiError("الجلسة غير موجودة", 404);
  if (session.status === "SUBMITTED") throw new ApiError("تم إرسال هذا الاختبار مسبقاً", 409);

  const ids = answers.map((a) => a.questionId);
  const valid = await prisma.assessmentQuestion.findMany({
    where: { id: { in: ids }, assessmentId: session.assessmentId, active: true },
    select: { id: true },
  });
  const validIds = new Set(valid.map((q) => q.id));
  const accepted = answers.filter((a) => validIds.has(a.questionId));
  if (accepted.length === 0) throw new ApiError("لا توجد إجابات صالحة", 422);

  const allowed = await prisma.assessmentOption.findMany({
    where: { assessmentId: session.assessmentId },
    select: { value: true },
  });
  const allowedValues = new Set(allowed.map((o) => o.value));
  for (const a of accepted) {
    if (!allowedValues.has(a.value)) {
      throw new ApiError("قيمة إجابة غير مسموح بها", 422);
    }
  }

  await prisma.$transaction(
    accepted.map((a) =>
      prisma.assessmentAnswer.upsert({
        where: { sessionId_questionId: { sessionId, questionId: a.questionId } },
        create: { sessionId, questionId: a.questionId, value: a.value },
        update: { value: a.value, answeredAt: new Date() },
      })
    )
  );

  return accepted.length;
}

export async function getProgress(sessionId: string) {
  return prisma.assessmentAnswer.findMany({
    where: { sessionId },
    select: { questionId: true, value: true },
  });
}

export interface SubmitOutcome {
  resultId: string;
  alreadySubmitted: boolean;
}

/**
 * الإرسال النهائي.
 * يرفض الإرسال ما لم تكن كل الأسئلة الفعّالة مُجابة، ويكتب النتيجة في معاملة واحدة.
 * إعادة الإرسال لنفس الجلسة لا تُنشئ نتيجة ثانية.
 */
export async function submitSession(sessionId: string): Promise<SubmitOutcome> {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: { result: { select: { id: true } } },
  });
  if (!session) throw new ApiError("الجلسة غير موجودة", 404);
  if (session.status === "SUBMITTED" && session.result) {
    return { resultId: session.result.id, alreadySubmitted: true };
  }

  const [questions, dimensions, ruleSet, answers] = await Promise.all([
    prisma.assessmentQuestion.findMany({
      where: { assessmentId: session.assessmentId, active: true },
      select: {
        id: true,
        number: true,
        text: true,
        dimensionId: true,
      },
    }),
    prisma.assessmentDimension.findMany({
      where: { assessmentId: session.assessmentId },
      orderBy: { displayOrder: "asc" },
    }),
    getActiveRuleSet(session.assessmentId),
    prisma.assessmentAnswer.findMany({
      where: { sessionId },
      select: { questionId: true, value: true },
    }),
  ]);

  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]));
  const missing = questions.filter((q) => !answerMap.has(q.id));
  if (missing.length > 0) {
    throw new ApiError(
      `لم تُجب على ${missing.length} من الأسئلة. أكمل الإجابات قبل الإرسال.`,
      422
    );
  }

  if (ruleSet.rules.length === 0) {
    throw new ApiError(
      "لم تُدخل الجداول المعيارية بعد. لا يمكن احتساب النتيجة قبل إدخالها.",
      503
    );
  }

  const gradeBands = [...new Set(ruleSet.rules.map((r) => r.gradeBand))];

  let scored;
  try {
    scored = scoreAssessment({
      dimensions: dimensions.map((d) => ({
        id: d.id,
        code: d.code,
        label: d.label,
        description: d.description,
        color: d.color,
        fields: d.fields,
        displayOrder: d.displayOrder,
      })),
      questions: questions.map((q) => ({
        id: q.id,
        number: q.number,
        text: q.text,
        dimensionId: q.dimensionId,
      })),
      rules: ruleSet.rules.map((r) => ({
        dimensionId: r.dimensionId,
        gradeBand: r.gradeBand,
        gender: r.gender,
        rawScore: r.rawScore,
        percentile: r.percentile,
      })),
      method: ruleSet.method,
      gradeBand: gradeBandOf(session.grade, gradeBands),
      gender: session.gender,
      answers: answerMap,
    });
  } catch (e) {
    if (e instanceof ScoringError) throw new ApiError(e.message, 503);
    throw e;
  }

  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: session.assessmentId },
    select: { version: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.assessmentResult.create({
      data: {
        sessionId,
        ruleSetId: ruleSet.id,
        assessmentVersion: assessment.version,
        topDimensions: scored.topDimensions,
        interestCode: scored.interestCode,
        recommendedFields: scored.recommendedFields,
        sections: {
          create: scored.sections.map((s: ResultSection) => ({
            dimensionCode: s.dimensionCode,
            dimensionLabel: s.dimensionLabel,
            displayOrder: s.displayOrder,
            rawScore: s.rawScore,
            percentile: s.percentile,
            cells: s.cells as unknown as Prisma.InputJsonValue,
          })),
        },
        analysis: {
          create: {
            rows: scored.analysis as unknown as Prisma.InputJsonValue,
            summary: buildSummary(scored.analysis, dimensions),
          },
        },
      },
      select: { id: true },
    });

    await tx.assessmentSession.update({
      where: { id: sessionId },
      data: { status: "SUBMITTED", submittedAt: new Date(), ruleSetId: ruleSet.id },
    });

    return created;
  });

  return { resultId: result.id, alreadySubmitted: false };
}

/** ملخّص وصفي مبني حرفياً على وصف الأبعاد المخزّن — بلا تفسير مُولَّد. */
function buildSummary(
  analysis: AnalysisRow[],
  dimensions: { code: string; label: string; description: string }[]
): string {
  const top = [...analysis].sort((a, b) => a.rank - b.rank).slice(0, 3);
  const byCode = new Map(dimensions.map((d) => [d.code, d]));
  return top
    .map((row, i) => {
      const dim = byCode.get(row.code);
      return `${i + 1}. ${row.label} (${row.percentile}٪): ${dim?.description ?? ""}`.trim();
    })
    .join("\n");
}

/** النتيجة الكاملة مقابل رمز الطالب. */
export async function getResultByToken(token: string) {
  const session = await getSessionByToken(token);
  if (!session || session.status !== "SUBMITTED") return null;
  return getResultBySessionId(session.id);
}

export async function getResultBySessionId(sessionId: string) {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      assessment: { select: { title: true, version: true } },
      result: {
        include: {
          sections: { orderBy: { displayOrder: "asc" } },
          analysis: true,
          ruleSet: { select: { version: true } },
        },
      },
    },
  });
  if (!session?.result) return null;

  const programs = session.result.recommendedFields.length
    ? await prisma.program.findMany({
        where: { field: { in: session.result.recommendedFields } },
        orderBy: { name: "asc" },
        take: 12,
        select: { id: true, code: true, name: true, field: true, institution: true, link: true },
      })
    : [];

  return { session, result: session.result, programs };
}
