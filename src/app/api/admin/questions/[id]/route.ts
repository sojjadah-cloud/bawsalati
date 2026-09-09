import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireAdmin } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";

const patchSchema = z.object({
  text: z.string().trim().min(5, "نص العبارة قصير جداً").max(400).optional(),
  active: z.boolean().optional(),
});

/**
 * تعديل نص عبارة أو تعطيلها.
 * لا يُسمح بتغيير المحور ولا الترتيب من هنا: هما جزء من بنية المقياس
 * التي ترتبط بها نتائج سابقة.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const input = await parseBody(req, patchSchema);

    await prisma.assessmentQuestion.update({
      where: { id },
      data: {
        ...(input.text ? { text: input.text } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });

    await audit("QUESTION_UPDATE", "AssessmentQuestion", {
      actor: session,
      entityId: id,
      meta: { textChanged: !!input.text, activeChanged: input.active !== undefined },
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
