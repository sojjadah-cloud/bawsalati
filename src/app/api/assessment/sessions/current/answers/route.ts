import { json, errorResponse, parseBody, ApiError } from "@/lib/api";
import { consume, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";
import { getAttemptToken } from "@/lib/attempt";
import { saveAnswersSchema } from "@/features/assessment/schemas";
import { requireOpenSession, saveAnswers } from "@/features/assessment/service";

/** حفظ تدريجي للإجابات. يُستدعى بعد كل اختيار. */
export async function POST(req: Request) {
  try {
    const token = await getAttemptToken();
    if (!token) throw new ApiError("لا توجد جلسة اختبار مفتوحة", 401);

    const limit = consume(`answers:${clientIp(req)}`, LIMITS.answer);
    if (!limit.allowed) throw new ApiError("عدد كبير من الطلبات — أعد المحاولة بعد قليل", 429);

    const body = await parseBody(req, saveAnswersSchema);
    const session = await requireOpenSession(token);
    const saved = await saveAnswers(session.id, body.answers);

    return json({ saved });
  } catch (e) {
    return errorResponse(e);
  }
}
