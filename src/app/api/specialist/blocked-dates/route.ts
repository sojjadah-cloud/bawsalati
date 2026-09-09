import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireSpecialist } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { blockedDateSchema } from "@/features/appointments/schemas";
import { isoDateToUtc } from "@/lib/time";

export async function POST(req: Request) {
  try {
    const session = await requireSpecialist();
    const input = await parseBody(req, blockedDateSchema);

    const created = await prisma.specialistBlockedDate.create({
      data: {
        specialistId: session.specialistId,
        date: isoDateToUtc(input.date),
        fullDay: input.fullDay,
        startTime: input.fullDay ? null : input.startTime || null,
        endTime: input.fullDay ? null : input.endTime || null,
        reason: input.reason || "",
      },
    });

    await audit("BLOCKED_DATE_CREATE", "SpecialistBlockedDate", {
      actor: session,
      entityId: created.id,
      meta: { date: input.date },
      ip: clientIp(req),
    });
    return json({ blocked: created }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
