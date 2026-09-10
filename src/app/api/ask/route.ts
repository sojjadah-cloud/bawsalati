import { z } from "zod";
import { json, errorResponse, parseBody, ApiError } from "@/lib/api";
import { consume, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";
import { ask, popularQuestions } from "@/features/faq/service";

const askSchema = z.object({
  question: z.string().trim().min(2, "اكتب سؤالك").max(300, "السؤال طويل جداً"),
});

/** أسئلة مقترحة تُعرض قبل أن يكتب الطالب شيئاً. */
export async function GET() {
  try {
    const questions = await popularQuestions();
    return json({ questions });
  } catch (e) {
    return errorResponse(e);
  }
}

/** سؤال الطالب. عام — لا يتطلب حساباً ولا يُخزَّن معه أي معرّف شخصي. */
export async function POST(req: Request) {
  try {
    const { question } = await parseBody(req, askSchema);

    const limit = consume(`ask:${clientIp(req)}`, LIMITS.ask);
    if (!limit.allowed) {
      throw new ApiError("عدد كبير من الأسئلة — أعد المحاولة بعد قليل", 429);
    }

    return json(await ask(question));
  } catch (e) {
    return errorResponse(e);
  }
}
