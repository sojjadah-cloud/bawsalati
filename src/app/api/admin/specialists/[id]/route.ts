import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json, errorResponse, parseBody, requireAdmin, ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";

const patchSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  active: z.boolean().optional(),
  password: z
    .string()
    .min(10, "كلمة المرور 10 محارف على الأقل")
    .regex(/[A-Za-z]/u, "أضف حرفاً لاتينياً واحداً على الأقل")
    .regex(/\d/u, "أضف رقماً واحداً على الأقل")
    .optional()
    .or(z.literal("")),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const input = await parseBody(req, patchSchema);

    // المدير لا يستطيع تعطيل حسابه هو، فلا يُقفل النظام على نفسه.
    if (id === session.id && input.active === false) {
      throw new ApiError("لا يمكنك تعطيل حسابك الحالي", 400);
    }

    await prisma.user.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      },
    });

    await audit("USER_UPDATE", "User", {
      actor: session,
      entityId: id,
      meta: { activeChanged: input.active !== undefined, passwordReset: !!input.password },
      ip: clientIp(req),
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
