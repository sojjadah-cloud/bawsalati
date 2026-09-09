import { prisma } from "@/lib/prisma";
import { json, noStore, errorResponse, parseBody, requireSpecialist, ApiError } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { availabilitySchema } from "@/features/appointments/schemas";
import { overlaps } from "@/lib/time";

export async function GET() {
  try {
    const session = await requireSpecialist();
    const [windows, blocked] = await Promise.all([
      prisma.specialistAvailability.findMany({
        where: { specialistId: session.specialistId },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      }),
      prisma.specialistBlockedDate.findMany({
        where: { specialistId: session.specialistId, date: { gte: new Date() } },
        orderBy: { date: "asc" },
      }),
    ]);
    return noStore({ windows, blocked });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSpecialist();
    const input = await parseBody(req, availabilitySchema);

    // منع تداخل نوافذ الدوام في اليوم نفسه.
    const sameDay = await prisma.specialistAvailability.findMany({
      where: { specialistId: session.specialistId, weekday: input.weekday },
      select: { startTime: true, endTime: true },
    });
    const clash = sameDay.some((w) =>
      overlaps({ startTime: input.startTime, endTime: input.endTime }, w)
    );
    if (clash) throw new ApiError("هذه الفترة تتداخل مع فترة أخرى في اليوم نفسه", 409);

    const created = await prisma.specialistAvailability.create({
      data: {
        specialistId: session.specialistId,
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime,
        slotMinutes: input.slotMinutes,
        active: input.active ?? true,
      },
    });

    await audit("AVAILABILITY_CREATE", "SpecialistAvailability", {
      actor: session,
      entityId: created.id,
      meta: { weekday: input.weekday },
      ip: clientIp(req),
    });
    return json({ window: created }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
