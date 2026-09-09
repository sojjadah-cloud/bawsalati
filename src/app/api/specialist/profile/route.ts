import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json, noStore, errorResponse, parseBody, requireSpecialist } from "@/lib/api";
import { audit, clientIp } from "@/lib/audit";

const profileSchema = z.object({
  title: z.string().trim().min(2, "أدخل المسمّى").max(120),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  notifyPhone: z
    .string()
    .trim()
    .regex(/^\d{8,15}$/u, "أدخل رقماً صحيحاً بصيغة دولية بلا رمز +")
    .optional()
    .or(z.literal("")),
  bookable: z.boolean().optional(),
  slotMinutes: z.coerce.number().int().min(10).max(180).optional(),
});

export async function GET() {
  try {
    const session = await requireSpecialist();
    const profile = await prisma.specialistProfile.findUnique({
      where: { id: session.specialistId },
      select: {
        title: true,
        bio: true,
        notifyPhone: true,
        bookable: true,
        slotMinutes: true,
        user: { select: { name: true, email: true } },
      },
    });
    return noStore({ profile });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSpecialist();
    const input = await parseBody(req, profileSchema);

    await prisma.specialistProfile.update({
      where: { id: session.specialistId },
      data: {
        title: input.title,
        bio: input.bio || "",
        notifyPhone: input.notifyPhone || null,
        bookable: input.bookable ?? true,
        slotMinutes: input.slotMinutes ?? 30,
      },
    });

    // الرقم نفسه لا يُسجَّل — تُسجَّل واقعة التغيير فقط.
    await audit("PROFILE_UPDATE", "SpecialistProfile", {
      actor: session,
      entityId: session.specialistId,
      meta: { notifyPhoneChanged: !!input.notifyPhone },
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
