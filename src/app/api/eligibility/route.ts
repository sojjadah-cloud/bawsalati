import { z } from "zod";
import { json, errorResponse, parseBody, ApiError } from "@/lib/api";
import { consume, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";
import { GRADES } from "@/lib/constants";
import { matchPrograms } from "@/features/programs/eligibility";
import { SUBJECTS, type Marks, type Subject } from "@/features/programs/requirements";

const gradeValues = GRADES.map((g) => g.value) as [string, ...string[]];
const subjectValues = [...SUBJECTS] as [string, ...string[]];

const schema = z.object({
  grade: z.enum(gradeValues, { errorMap: () => ({ message: "اختر الصف الدراسي" }) }),
  /** الصفّان التاسع والعاشر: المواد بلا درجات */
  subjects: z.array(z.enum(subjectValues)).max(20).optional(),
  /** الحادي عشر والثاني عشر: درجة لكل مادة */
  marks: z
    .array(
      z.object({
        subject: z.enum(subjectValues),
        mark: z.number().min(0).max(100),
      })
    )
    .max(20)
    .optional(),
});

/** مطابقة الطالب ببرامج الدليل. عام — لا يتطلب حساباً ولا يُخزَّن شيء. */
export async function POST(req: Request) {
  try {
    const input = await parseBody(req, schema);

    const limit = consume(`eligibility:${clientIp(req)}`, LIMITS.ask);
    if (!limit.allowed) {
      throw new ApiError("عدد كبير من الطلبات — أعد المحاولة بعد قليل", 429);
    }

    const marks: Marks = {};
    for (const m of input.marks ?? []) marks[m.subject as Subject] = m.mark;

    const result = await matchPrograms({
      grade: input.grade,
      subjects: (input.subjects ?? []) as Subject[],
      marks: Object.keys(marks).length > 0 ? marks : undefined,
    });

    return json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
