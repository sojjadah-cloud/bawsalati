import { prisma } from "@/lib/prisma";
import { json, errorResponse, requireSpecialist, assertSameOrigin, ApiError } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const session = await requireSpecialist();
    const { id } = await params;

    const owned = await prisma.specialistBlockedDate.findFirst({
      where: { id, specialistId: session.specialistId },
      select: { id: true },
    });
    if (!owned) throw new ApiError("السجل غير موجود", 404);

    await prisma.specialistBlockedDate.delete({ where: { id } });
    await audit("BLOCKED_DATE_DELETE", "SpecialistBlockedDate", {
      actor: session,
      entityId: id,
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
