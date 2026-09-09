import { json, errorResponse, parseBody, ApiError } from "@/lib/api";
import { consume, LIMITS } from "@/lib/rate-limit";
import { audit, clientIp } from "@/lib/audit";
import { setAttemptCookie } from "@/lib/attempt";
import { startSessionSchema } from "@/features/assessment/schemas";
import { startSession } from "@/features/assessment/service";

/** بدء جلسة اختبار جديدة. عام — لا يتطلب حساباً. */
export async function POST(req: Request) {
  try {
    const input = await parseBody(req, startSessionSchema);
    const ip = clientIp(req);

    const limit = consume(`assessment:${ip}`, LIMITS.assessmentStart);
    if (!limit.allowed) {
      throw new ApiError(
        `عدد كبير من المحاولات. حاول بعد ${Math.ceil(limit.retryAfterSeconds / 60)} دقيقة.`,
        429
      );
    }

    const { sessionId, token } = await startSession(input);
    await setAttemptCookie(token);

    // لا تُسجَّل بيانات الطالب في سجل التدقيق — المعرّف والصف فقط.
    await audit("ASSESSMENT_START", "AssessmentSession", {
      entityId: sessionId,
      meta: { grade: input.grade },
      ip,
    });

    return json({ ok: true }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
