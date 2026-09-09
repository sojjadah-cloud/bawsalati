import { json, errorResponse, parseBody, ApiError } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { getAttemptToken } from "@/lib/attempt";
import { submitSchema } from "@/features/assessment/schemas";
import { getSessionByToken, submitSession } from "@/features/assessment/service";
import { notifySpecialistInApp } from "@/lib/notifications";

/**
 * الإرسال النهائي. آمن ضد التكرار: إعادة الإرسال تُعيد النتيجة نفسها
 * بدل إنشاء نتيجة ثانية.
 */
export async function POST(req: Request) {
  try {
    const token = await getAttemptToken();
    if (!token) throw new ApiError("لا توجد جلسة اختبار مفتوحة", 401);

    await parseBody(req, submitSchema);

    const session = await getSessionByToken(token);
    if (!session) throw new ApiError("انتهت صلاحية الجلسة", 404);

    const outcome = await submitSession(session.id);

    if (!outcome.alreadySubmitted) {
      await audit("ASSESSMENT_SUBMIT", "AssessmentSession", {
        entityId: session.id,
        meta: { grade: session.grade },
        ip: clientIp(req),
      });
      await notifySpecialistInApp({
        specialistId: null,
        type: "ASSESSMENT_NEW",
        title: "اختبار جديد مكتمل",
        body: `${session.studentName} — ${session.grade}`,
        link: "/specialist/assessments",
      });
    }

    // الرمز يعود مرة واحدة ليُبنى منه رابط النتيجة.
    return json({ resultToken: token });
  } catch (e) {
    return errorResponse(e);
  }
}
