import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { noStore, json, errorResponse, parseBody, requireSpecialist } from "@/lib/api";

/** تنبيهات الأخصائي: الموجّهة له، والعامة لكل الأخصائيين. */
function audienceFilter(specialistId: string) {
  return { OR: [{ specialistId }, { specialistId: null }] };
}

export async function GET() {
  try {
    const session = await requireSpecialist();
    const where = audienceFilter(session.specialistId);

    const [items, unread] = await Promise.all([
      prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          link: true,
          read: true,
          createdAt: true,
        },
      }),
      prisma.inAppNotification.count({ where: { ...where, read: false } }),
    ]);

    return noStore({ items, unread });
  } catch (e) {
    return errorResponse(e);
  }
}

const markSchema = z.object({
  /** معرّف تنبيه بعينه، أو الكل عند غيابه */
  id: z.string().trim().min(1).optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireSpecialist();
    const { id } = await parseBody(req, markSchema);
    const where = audienceFilter(session.specialistId);

    await prisma.inAppNotification.updateMany({
      where: id ? { ...where, id } : { ...where, read: false },
      data: { read: true },
    });

    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
