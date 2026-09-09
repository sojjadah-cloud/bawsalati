import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireSpecialist, ApiError } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";
import { changeStatus } from "@/features/appointments/service";
import {
  appointmentNotesSchema,
  updateAppointmentStatusSchema,
} from "@/features/appointments/schemas";

const patchSchema = z.union([
  updateAppointmentStatusSchema.extend({ kind: z.literal("status") }),
  appointmentNotesSchema.extend({ kind: z.literal("notes") }),
]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSpecialist();
    const { id } = await params;
    const body = await parseBody(req, patchSchema);

    if (body.kind === "status") {
      const updated = await changeStatus({
        appointmentId: id,
        specialistId: session.specialistId,
        toStatus: body.status,
        note: body.note || "",
        actorId: session.id,
      });
      await audit("APPOINTMENT_STATUS", "Appointment", {
        actor: session,
        entityId: id,
        meta: { status: body.status },
        ip: clientIp(req),
      });
      return json({ appointment: updated });
    }

    // الملاحظات تخصّ صاحب الحجز فقط.
    const owned = await prisma.appointment.findFirst({
      where: { id, specialistId: session.specialistId },
      select: { id: true },
    });
    if (!owned) throw new ApiError("الحجز غير موجود", 404);

    await prisma.appointment.update({
      where: { id },
      data: { specialistNotes: body.specialistNotes || null },
    });
    await audit("APPOINTMENT_NOTES", "Appointment", {
      actor: session,
      entityId: id,
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
