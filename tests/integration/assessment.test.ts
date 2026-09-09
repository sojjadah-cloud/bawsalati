/**
 * اختبارات تكامل لمسار الاختبار الكامل عبر خدمات الخادم.
 * تنشئ جلسات اختبار مؤقّتة وتحذفها بعد الانتهاء.
 */
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  getActiveAssessment,
  saveAnswers,
  startSession,
  submitSession,
  getResultByToken,
} from "@/features/assessment/service";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const createdSessions: string[] = [];
const MARKER = `اختبار آلي ${Date.now()}`;

afterAll(async () => {
  if (createdSessions.length > 0) {
    await prisma.assessmentSession.deleteMany({ where: { id: { in: createdSessions } } });
  }
  await prisma.$disconnect();
});

async function newSession(grade = "11") {
  const s = await startSession({
    studentName: MARKER,
    grade: grade as "10" | "11" | "12",
    phone: "92000001",
    consent: true,
  });
  createdSessions.push(s.sessionId);
  return s;
}

describe("بنية المقياس في قاعدة البيانات", () => {
  it("يحتوي 54 عبارة موزّعة 9 مجموعات × 6", async () => {
    const assessment = await getActiveAssessment();
    expect(assessment.groups).toHaveLength(9);
    for (const g of assessment.groups) expect(g.questions).toHaveLength(6);
    const all = assessment.groups.flatMap((g) => g.questions);
    expect(all).toHaveLength(54);
    const numbers = all.map((q) => q.number).sort((a, b) => a - b);
    expect(numbers[0]).toBe(1);
    expect(numbers[53]).toBe(54);
    expect(new Set(numbers).size).toBe(54);
  });

  it("يعرّف ستة محاور وسلّم إجابة", async () => {
    const assessment = await getActiveAssessment();
    expect(assessment.dimensions).toHaveLength(6);
    expect(assessment.options.length).toBeGreaterThanOrEqual(2);
  });
});

describe("مسار الإجابة والإرسال", () => {
  it("يحفظ الإجابات ولا يفقدها عند إعادة الحفظ", async () => {
    const { sessionId } = await newSession();
    const assessment = await getActiveAssessment();
    const questions = assessment.groups.flatMap((g) => g.questions);

    await saveAnswers(sessionId, [{ questionId: questions[0].id, value: 1 }]);
    await saveAnswers(sessionId, [{ questionId: questions[1].id, value: 0 }]);
    // تعديل الإجابة نفسها لا يُنشئ سجلاً ثانياً
    await saveAnswers(sessionId, [{ questionId: questions[0].id, value: 0 }]);

    const stored = await prisma.assessmentAnswer.findMany({ where: { sessionId } });
    expect(stored).toHaveLength(2);
    expect(stored.find((a) => a.questionId === questions[0].id)?.value).toBe(0);
  });

  it("يرفض الإرسال قبل اكتمال كل العبارات", async () => {
    const { sessionId } = await newSession();
    const assessment = await getActiveAssessment();
    const questions = assessment.groups.flatMap((g) => g.questions);
    await saveAnswers(
      sessionId,
      questions.slice(0, 53).map((q) => ({ questionId: q.id, value: 1 }))
    );
    await expect(submitSession(sessionId)).rejects.toThrow(/لم تُجب/u);
  });

  it("يرفض قيمة إجابة خارج السلّم المعرّف", async () => {
    const { sessionId } = await newSession();
    const assessment = await getActiveAssessment();
    const questions = assessment.groups.flatMap((g) => g.questions);
    await expect(
      saveAnswers(sessionId, [{ questionId: questions[0].id, value: 5 }])
    ).rejects.toThrow(/غير مسموح/u);
  });

  it("ينتج ستة جداول 3×3 وجدول تحليل بعد الإرسال", async () => {
    const { sessionId, token } = await newSession("12");
    const assessment = await getActiveAssessment();
    const questions = assessment.groups.flatMap((g) => g.questions);

    await saveAnswers(
      sessionId,
      questions.map((q) => ({ questionId: q.id, value: q.number % 2 === 0 ? 1 : 0 }))
    );
    const outcome = await submitSession(sessionId);
    expect(outcome.alreadySubmitted).toBe(false);

    const data = await getResultByToken(token);
    expect(data).not.toBeNull();
    expect(data!.result.sections).toHaveLength(6);
    for (const section of data!.result.sections) {
      const cells = section.cells as unknown as { questionNumber: number }[][];
      expect(cells).toHaveLength(3);
      for (const row of cells) expect(row).toHaveLength(3);
    }
    const rows = data!.result.analysis?.rows as unknown as { rank: number }[];
    expect(rows).toHaveLength(6);
    expect(data!.result.topDimensions).toHaveLength(3);
  });

  it("لا يُنشئ نتيجة ثانية عند إعادة الإرسال", async () => {
    const { sessionId } = await newSession();
    const assessment = await getActiveAssessment();
    const questions = assessment.groups.flatMap((g) => g.questions);
    await saveAnswers(sessionId, questions.map((q) => ({ questionId: q.id, value: 1 })));

    const first = await submitSession(sessionId);
    const second = await submitSession(sessionId);
    expect(second.alreadySubmitted).toBe(true);
    expect(second.resultId).toBe(first.resultId);

    const count = await prisma.assessmentResult.count({ where: { sessionId } });
    expect(count).toBe(1);
  });

  it("يمنع تعديل الإجابات بعد الإرسال", async () => {
    const { sessionId } = await newSession();
    const assessment = await getActiveAssessment();
    const questions = assessment.groups.flatMap((g) => g.questions);
    await saveAnswers(sessionId, questions.map((q) => ({ questionId: q.id, value: 1 })));
    await submitSession(sessionId);

    await expect(
      saveAnswers(sessionId, [{ questionId: questions[0].id, value: 0 }])
    ).rejects.toThrow(/مسبقاً/u);
  });

  it("يربط النتيجة بإصدار قواعد التصحيح المستخدم", async () => {
    const { sessionId, token } = await newSession();
    const assessment = await getActiveAssessment();
    const questions = assessment.groups.flatMap((g) => g.questions);
    await saveAnswers(sessionId, questions.map((q) => ({ questionId: q.id, value: 1 })));
    await submitSession(sessionId);

    const data = await getResultByToken(token);
    expect(data!.result.ruleSet.version).toBeGreaterThanOrEqual(1);
    expect(data!.result.assessmentVersion).toBeGreaterThanOrEqual(1);
  });
});

describe("حماية الوصول للنتيجة", () => {
  it("لا يعيد نتيجة لرمز غير صحيح", async () => {
    expect(await getResultByToken("رمز-غير-صحيح")).toBeNull();
    expect(await getResultByToken("")).toBeNull();
  });

  it("لا يعيد نتيجة لجلسة لم تُرسل بعد", async () => {
    const { token } = await newSession();
    expect(await getResultByToken(token)).toBeNull();
  });
});
