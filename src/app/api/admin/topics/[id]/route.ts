import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireAdmin, assertSameOrigin, ApiError } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  requiresDetails: z.boolean().optional(),
  displayOrder: z.coerce.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const input = await parseBody(req, patchSchema);

    await prisma.consultationTopic.update({ where: { id }, data: input });
    await audit("TOPIC_UPDATE", "ConsultationTopic", {
      actor: session,
      entityId: id,
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

/** الموضوع المرتبط بحجوزات لا يُحذف — يُعطَّل بدل ذلك حفاظاً على السجل. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const session = await requireAdmin();
    const { id } = await params;

    const used = await prisma.appointment.count({ where: { topicId: id } });
    if (used > 0) {
      throw new ApiError("لا يمكن حذف موضوع مرتبط بحجوزات — عطّله بدلاً من ذلك", 409);
    }

    await prisma.consultationTopic.delete({ where: { id } });
    await audit("TOPIC_DELETE", "ConsultationTopic", {
      actor: session,
      entityId: id,
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
